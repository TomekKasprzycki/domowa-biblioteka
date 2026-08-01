import type { LoanEntity } from "@/server/loan/loan.entity";

export const LoanStatus = {
  REQUESTED: "requested",
  ACTIVE: "active",
  RETURN_PENDING: "return_pending",
  RETURNED: "returned",
  DECLINED: "declined",
} as const;

export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

// "Open" means the book is physically out and therefore unavailable to everyone
// else. A return awaiting the owner's confirmation still counts: the borrower
// has said they returned it, but until the owner confirms receipt the book must
// not be borrowable by anyone else.
//
// This list is the source of truth for unavailability in application code. Its
// database counterpart is the loans_one_open_per_book partial unique index in
// loan.entity.ts — the two must be kept in step by hand, because the index
// predicate is a SQL string and nothing compares it to this array.
export const OPEN_LOAN_STATUSES: readonly LoanStatus[] = [
  LoanStatus.ACTIVE,
  LoanStatus.RETURN_PENDING,
];

export type ApproveLoanResult = LoanEntity | "not-found" | "already-borrowed";
