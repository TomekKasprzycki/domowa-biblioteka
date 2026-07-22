import { DataSource } from "typeorm";
import {
  createLoanRequest,
  findActiveLoanForBook,
  findActiveLoansForBooks,
  findExistingRequest,
  findIncomingRequests,
  findOutgoingLoans,
  countIncomingRequests,
  approveLoan,
  declineLoan,
} from "@/server/loan/loan.repository";
import { LoanEntity } from "@/server/loan/loan.entity";
import { LoanStatus } from "@/server/loan/loan.types";
import { createBook } from "@/server/book/book.repository";
import { BookEntity } from "@/server/book/book.entity";
import { createUser } from "@/server/user/user.repository";
import { UserEntity } from "@/server/user/user.entity";
import { getDataSource } from "@/lib/data-source";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("loanRepository", () => {
  const suffix = Date.now();
  const ownerEmail = `loan-owner-${suffix}@example.com`;
  const borrowerEmail = `loan-borrower-${suffix}@example.com`;
  const otherBorrowerEmail = `loan-other-${suffix}@example.com`;

  let ds: DataSource;
  let ownerId: string;
  let borrowerId: string;
  let otherBorrowerId: string;
  let bookA: string;
  let bookB: string;
  let bookC: string;
  let loanA: string;
  let loanB: string;

  beforeAll(async () => {
    ds = await getDataSource();
    const owner = await createUser({
      email: ownerEmail,
      passwordHash: "hashed_password_value",
      name: "Loan Owner",
    });
    const borrower = await createUser({
      email: borrowerEmail,
      passwordHash: "hashed_password_value",
      name: "Loan Borrower",
    });
    const otherBorrower = await createUser({
      email: otherBorrowerEmail,
      passwordHash: "hashed_password_value",
      name: "Other Borrower",
    });
    ownerId = owner.id;
    borrowerId = borrower.id;
    otherBorrowerId = otherBorrower.id;

    bookA = (
      await createBook({
        userId: ownerId,
        title: `Loan Book A ${suffix}`,
        author: "Author A",
      })
    ).id;
    bookB = (
      await createBook({
        userId: ownerId,
        title: `Loan Book B ${suffix}`,
        author: "Author B",
      })
    ).id;
    bookC = (
      await createBook({
        userId: ownerId,
        title: `Loan Book C ${suffix}`,
        author: "Author C",
      })
    ).id;
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      await ds.getRepository(LoanEntity).delete({ ownerId });
      await ds.getRepository(BookEntity).delete({ userId: ownerId });
      const users = ds.getRepository(UserEntity);
      await users.delete({ email: ownerEmail });
      await users.delete({ email: borrowerEmail });
      await users.delete({ email: otherBorrowerEmail });
      await ds.destroy();
    }
  });

  it("creates a requested loan with a generated id and no start date", async () => {
    // given
    // bookA is owned by ownerId and has no loans

    // when
    const loan = await createLoanRequest({
      bookId: bookA,
      requesterId: borrowerId,
      ownerId,
    });

    // then
    expect(loan.id).toMatch(UUID_REGEX);
    expect(loan.bookId).toBe(bookA);
    expect(loan.requesterId).toBe(borrowerId);
    expect(loan.ownerId).toBe(ownerId);
    expect(loan.status).toBe(LoanStatus.REQUESTED);
    expect(loan.startedAt).toBeNull();
    loanA = loan.id;
  });

  it("returns null from findActiveLoanForBook while the loan is only requested", async () => {
    // given
    // loanA is requested for bookA

    // when
    const active = await findActiveLoanForBook(bookA);

    // then
    expect(active).toBeNull();
  });

  it("finds an existing requested loan for the book/requester pair", async () => {
    // given
    // loanA is requested for bookA by borrowerId

    // when
    const existing = await findExistingRequest(bookA, borrowerId);

    // then
    expect(existing?.id).toBe(loanA);
  });

  it("returns null from findExistingRequest for a different requester", async () => {
    // given
    // loanA is requested for bookA by borrowerId

    // when
    const existing = await findExistingRequest(bookA, otherBorrowerId);

    // then
    expect(existing).toBeNull();
  });

  it("returns incoming requests for the owner with book and requester relations", async () => {
    // given
    // loanA is a requested loan addressed to ownerId

    // when
    const incoming = await findIncomingRequests(ownerId);

    // then
    const item = incoming.find((l) => l.id === loanA);
    expect(item).toBeDefined();
    expect(item?.book.title).toBe(`Loan Book A ${suffix}`);
    expect(item?.requester.email).toBe(borrowerEmail);
  });

  it("counts the owner's pending incoming requests", async () => {
    // given
    // loanA is the owner's only requested loan

    // when
    const count = await countIncomingRequests(ownerId);

    // then
    expect(count).toBe(1);
  });

  it("returns not-found when a non-owner tries to approve", async () => {
    // given
    // loanA is requested and owned by ownerId

    // when
    const result = await approveLoan(loanA, borrowerId);

    // then
    expect(result).toBe("not-found");
    const unchanged = await findExistingRequest(bookA, borrowerId);
    expect(unchanged?.status).toBe(LoanStatus.REQUESTED);
  });

  it("approves the loan for the owner, flipping it to active and stamping startedAt", async () => {
    // given
    // loanA is requested and owned by ownerId

    // when
    const result = await approveLoan(loanA, ownerId);

    // then
    if (typeof result === "string") throw new Error("expected a loan entity");
    expect(result.id).toBe(loanA);
    expect(result.status).toBe(LoanStatus.ACTIVE);
    expect(result.startedAt).toBeInstanceOf(Date);
  });

  it("returns the active loan for the book once approved", async () => {
    // given
    // loanA is active for bookA

    // when
    const active = await findActiveLoanForBook(bookA);

    // then
    expect(active?.id).toBe(loanA);
  });

  it("no longer reports a pending request once the loan is active", async () => {
    // given
    // loanA moved from requested to active

    // when
    const existing = await findExistingRequest(bookA, borrowerId);

    // then
    expect(existing).toBeNull();
  });

  it("returns active loans for the requested books with the requester populated", async () => {
    // given
    // loanA is active for bookA; bookB has no loans

    // when
    const loans = await findActiveLoansForBooks([bookA, bookB]);

    // then
    expect(loans).toHaveLength(1);
    expect(loans[0].id).toBe(loanA);
    expect(loans[0].requester.email).toBe(borrowerEmail);
  });

  it("short-circuits findActiveLoansForBooks on an empty book list", async () => {
    // given
    // no book ids to look up

    // when
    const loans = await findActiveLoansForBooks([]);

    // then
    expect(loans).toEqual([]);
  });

  it("declines a requested loan for the owner", async () => {
    // given
    const requested = await createLoanRequest({
      bookId: bookB,
      requesterId: borrowerId,
      ownerId,
    });
    loanB = requested.id;

    // when
    const result = await declineLoan(loanB, ownerId);

    // then
    expect(result).toBe(true);
    const row = await ds
      .getRepository(LoanEntity)
      .findOne({ where: { id: loanB } });
    expect(row?.status).toBe(LoanStatus.DECLINED);
  });

  it("returns false from declineLoan for a non-owner", async () => {
    // given
    // loanB is already declined, so no requested row matches anyway

    // when
    const result = await declineLoan(loanB, borrowerId);

    // then
    expect(result).toBe(false);
  });

  it("treats a declined loan as terminal so the same borrower may request again", async () => {
    // given
    // loanB is declined for bookB by borrowerId
    expect(await findExistingRequest(bookB, borrowerId)).toBeNull();

    // when
    const reRequest = await createLoanRequest({
      bookId: bookB,
      requesterId: borrowerId,
      ownerId,
    });

    // then
    expect(reRequest.status).toBe(LoanStatus.REQUESTED);
    expect(reRequest.id).not.toBe(loanB);
  });

  it("returns the borrower's requested, active and declined loans with relations", async () => {
    // given
    // borrowerId has an active loan (bookA), a declined one (bookB) and a fresh request (bookB)

    // when
    const outgoing = await findOutgoingLoans(borrowerId);

    // then
    const statuses = outgoing.map((l) => l.status);
    expect(statuses).toContain(LoanStatus.ACTIVE);
    expect(statuses).toContain(LoanStatus.DECLINED);
    expect(statuses).toContain(LoanStatus.REQUESTED);
    const active = outgoing.find((l) => l.id === loanA);
    expect(active?.book.title).toBe(`Loan Book A ${suffix}`);
    expect(active?.owner.email).toBe(ownerEmail);
  });

  it("allows at most one active loan per book under concurrent approvals", async () => {
    // given
    const first = await createLoanRequest({
      bookId: bookC,
      requesterId: borrowerId,
      ownerId,
    });
    const second = await createLoanRequest({
      bookId: bookC,
      requesterId: otherBorrowerId,
      ownerId,
    });

    // when
    const results = await Promise.all([
      approveLoan(first.id, ownerId),
      approveLoan(second.id, ownerId),
    ]);

    // then
    const winners = results.filter((r) => typeof r !== "string");
    const losers = results.filter((r) => r === "already-borrowed");
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(winners[0]).toMatchObject({ status: LoanStatus.ACTIVE });

    const activeCount = await ds
      .getRepository(LoanEntity)
      .count({ where: { bookId: bookC, status: LoanStatus.ACTIVE } });
    expect(activeCount).toBe(1);
  });
});
