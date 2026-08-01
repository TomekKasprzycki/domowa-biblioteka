import { In } from "typeorm";
import { getDataSource } from "@/lib/data-source";
import { generateId } from "@/lib/generate-id.utils";
import { isDuplicateError } from "@/lib/db-error.utils";
import { LoanEntity } from "@/server/loan/loan.entity";
import {
  ApproveLoanResult,
  LoanStatus,
  OPEN_LOAN_STATUSES,
} from "@/server/loan/loan.types";

export async function createLoanRequest(data: {
  bookId: string;
  requesterId: string;
  ownerId: string;
}): Promise<LoanEntity> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  const loan = repo.create({
    ...data,
    id: generateId(),
    status: LoanStatus.REQUESTED,
    startedAt: null,
  });
  return repo.save(loan);
}

// "Open" covers active and return_pending alike — see OPEN_LOAN_STATUSES. Both
// readers below answer "is this book unavailable?", so neither may narrow to
// active only: a book whose return is awaiting the owner's confirmation is
// still out.
export async function findOpenLoanForBook(
  bookId: string
): Promise<LoanEntity | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.findOne({
    where: { bookId, status: In(OPEN_LOAN_STATUSES) },
  });
}

// Relation-free by design: this is /discover's reader, and the borrower's
// identity must not travel to friends browsing someone else's catalog. The
// owner's view uses findOpenLoansForOwner instead.
export async function findOpenLoansForBooks(
  bookIds: string[]
): Promise<LoanEntity[]> {
  if (bookIds.length === 0) return [];
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.find({
    where: { bookId: In(bookIds), status: In(OPEN_LOAN_STATUSES) },
  });
}

export async function findExistingRequest(
  bookId: string,
  requesterId: string
): Promise<LoanEntity | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.findOne({
    where: { bookId, requesterId, status: LoanStatus.REQUESTED },
  });
}

export async function findRequestedLoansForBooksByRequester(
  bookIds: string[],
  requesterId: string
): Promise<LoanEntity[]> {
  if (bookIds.length === 0) return [];
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.find({
    where: { bookId: In(bookIds), requesterId, status: LoanStatus.REQUESTED },
  });
}

export async function findIncomingRequests(
  ownerId: string
): Promise<LoanEntity[]> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.find({
    where: { ownerId, status: LoanStatus.REQUESTED },
    order: { createdAt: "DESC" },
    relations: { book: true, requester: true },
  });
}

export async function findOutgoingLoans(
  requesterId: string
): Promise<LoanEntity[]> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.find({
    where: {
      requesterId,
      // Every status the borrower's page renders: three live states plus the
      // two terminal ones that populate its "Past loans" section. Listed
      // explicitly so a future status has to be considered rather than
      // silently inherited.
      status: In([
        LoanStatus.REQUESTED,
        LoanStatus.ACTIVE,
        LoanStatus.RETURN_PENDING,
        LoanStatus.RETURNED,
        LoanStatus.DECLINED,
      ]),
    },
    order: { updatedAt: "DESC" },
    relations: { book: true, owner: true },
  });
}

export async function countIncomingRequests(ownerId: string): Promise<number> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.count({ where: { ownerId, status: LoanStatus.REQUESTED } });
}

export async function approveLoan(
  loanId: string,
  ownerId: string
): Promise<ApproveLoanResult> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  try {
    const result = await repo.update(
      { id: loanId, ownerId, status: LoanStatus.REQUESTED },
      { status: LoanStatus.ACTIVE, startedAt: new Date() }
    );
    if (!result.affected) return "not-found";
  } catch (error) {
    // The loans_one_open_per_book partial unique index rejects a second
    // active loan for the same book — a concurrent approval lost the race.
    if (isDuplicateError(error)) return "already-borrowed";
    throw error;
  }
  const loan = await repo.findOne({ where: { id: loanId, ownerId } });
  return loan ?? "not-found";
}

export async function declineLoan(
  loanId: string,
  ownerId: string
): Promise<boolean> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  const result = await repo.update(
    { id: loanId, ownerId, status: LoanStatus.REQUESTED },
    { status: LoanStatus.DECLINED }
  );
  return !!result.affected;
}

// The two halves of the return handshake. Each matches on the acting user AND
// the expected current status in one conditional UPDATE, so authorisation and
// state validity are enforced atomically — a wrong actor, a wrong state, or a
// missing row all collapse to the same `false`. Note the asymmetry: the
// borrower is matched on requesterId, the owner on ownerId.
export async function markReturned(
  loanId: string,
  requesterId: string
): Promise<boolean> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  const result = await repo.update(
    { id: loanId, requesterId, status: LoanStatus.ACTIVE },
    { status: LoanStatus.RETURN_PENDING }
  );
  return !!result.affected;
}

export async function confirmReturn(
  loanId: string,
  ownerId: string
): Promise<boolean> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  const result = await repo.update(
    { id: loanId, ownerId, status: LoanStatus.RETURN_PENDING },
    { status: LoanStatus.RETURNED }
  );
  return !!result.affected;
}

export async function findPendingReturnsForOwner(
  ownerId: string
): Promise<LoanEntity[]> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.find({
    where: { ownerId, status: LoanStatus.RETURN_PENDING },
    order: { updatedAt: "DESC" },
    relations: { book: true, requester: true },
  });
}

export async function countPendingReturns(ownerId: string): Promise<number> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.count({
    where: { ownerId, status: LoanStatus.RETURN_PENDING },
  });
}

// The owner's own view of what is out (FR-010). Loads the requester so the
// collection page can name the borrower — which is safe here precisely because
// the query is scoped to loans the caller owns.
// Any loan row at all, open or closed. Deleting a book with loan history is
// refused by the FK regardless of status, so the delete guard has to ask this
// broader question than "is it currently out?".
export async function countLoansForBook(bookId: string): Promise<number> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.count({ where: { bookId } });
}

export async function findOpenLoansForOwner(
  ownerId: string
): Promise<LoanEntity[]> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.find({
    where: { ownerId, status: In(OPEN_LOAN_STATUSES) },
    relations: { requester: true },
  });
}
