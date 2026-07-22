import { In } from "typeorm";
import { getDataSource } from "@/lib/data-source";
import { generateId } from "@/lib/generate-id.utils";
import { isDuplicateError } from "@/lib/db-error.utils";
import { LoanEntity } from "./loan.entity";
import { ApproveLoanResult, LoanStatus } from "./loan.types";

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

export async function findActiveLoanForBook(
  bookId: string
): Promise<LoanEntity | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.findOne({ where: { bookId, status: LoanStatus.ACTIVE } });
}

export async function findActiveLoansForBooks(
  bookIds: string[]
): Promise<LoanEntity[]> {
  if (bookIds.length === 0) return [];
  const ds = await getDataSource();
  const repo = ds.getRepository<LoanEntity>("loans");
  return repo.find({
    where: { bookId: In(bookIds), status: LoanStatus.ACTIVE },
    relations: { requester: true },
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
      status: In([
        LoanStatus.REQUESTED,
        LoanStatus.ACTIVE,
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
    // The loans_one_active_per_book partial unique index rejects a second
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
