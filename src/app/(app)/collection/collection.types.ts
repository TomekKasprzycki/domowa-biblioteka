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

// Outcome of an ISBN lookup against GET /api/isbn. "unauthenticated" is
// distinct from "not-found" because middleware redirects a signed-out or
// expired request to /login rather than reaching the route handler — telling
// the user "not found" in that case would lie about why the lookup failed.
// "error" covers a body that fails to parse as JSON for any other reason
// (e.g. a malformed proxy response) — also not the same claim as "not found".
export type IsbnLookupResult =
  | { status: "found"; title: string; author: string | null }
  | { status: "not-found" }
  | { status: "unauthenticated" }
  | { status: "error" };
