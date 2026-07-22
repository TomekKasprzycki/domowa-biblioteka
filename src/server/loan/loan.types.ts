import type { LoanEntity } from "./loan.entity";

export const LoanStatus = {
  REQUESTED: "requested",
  ACTIVE: "active",
  DECLINED: "declined",
} as const;

export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus];

export type ApproveLoanResult = LoanEntity | "not-found" | "already-borrowed";
