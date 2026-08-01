import type { LoanStatus } from "@/server/loan/loan.types";

// A book in the owner's own collection, carrying the loan state the owner is
// entitled to see (FR-010). `loan` is null whenever the book is on the shelf;
// only open loans are ever attached, so a closed loan reads the same as none.
export type CollectionBook = {
  id: string;
  title: string;
  author: string;
  notes: string | null;
  createdAt: Date;
  loan: {
    status: LoanStatus;
    borrowerName: string;
    startedAt: Date | null;
  } | null;
};
