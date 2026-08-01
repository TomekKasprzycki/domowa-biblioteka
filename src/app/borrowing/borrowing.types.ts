import type { LoanStatus } from "@/server/loan/loan.types";

export type OutgoingLoan = {
  id: string;
  book: { title: string; author: string };
  owner: { name: string };
  // Sourced from LoanStatus rather than restating the literals, so adding a
  // status to the state machine can never leave this union silently stale.
  status: LoanStatus;
  startedAt: Date | null;
};
