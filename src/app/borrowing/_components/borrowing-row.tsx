"use client";

import { useActionState } from "react";
import { markReturnedAction } from "@/app/borrow/actions";
import type { OutgoingLoan } from "@/app/borrowing/borrowing.types";

function statusLabel(loan: OutgoingLoan): string {
  const owner = loan.owner.name;
  switch (loan.status) {
    case "active":
      return `Borrowed from ${owner}`;
    case "return_pending":
      return `Return pending — waiting for ${owner} to confirm`;
    case "returned":
      return `Returned to ${owner}`;
    case "declined":
      return `Declined by ${owner}`;
    default:
      return `Requested from ${owner}`;
  }
}

export function BorrowingRow({ loan }: { loan: OutgoingLoan }) {
  const [error, action, isPending] = useActionState(markReturnedAction, null);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">{loan.book.title}</p>
          <p className="text-sm text-zinc-600">{loan.book.author}</p>
          <p className="mt-1 text-sm text-zinc-500">{statusLabel(loan)}</p>
        </div>
        {/* Only an active loan can be returned. Once marked, there is no way
            back — the owner's confirmation is the only forward move — so the
            dialog is the single guard against a mis-click. */}
        {loan.status === "active" && (
          <div className="shrink-0">
            <form action={action}>
              <input type="hidden" name="loanId" value={loan.id} />
              <button
                type="submit"
                disabled={isPending}
                onClick={(e) => {
                  if (
                    !window.confirm(
                      `Mark "${loan.book.title}" as returned to ${loan.owner.name}? This can't be undone.`
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                I returned it
              </button>
            </form>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}
