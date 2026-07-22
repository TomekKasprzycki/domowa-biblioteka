"use client";

import { useActionState } from "react";
import { requestBorrowAction } from "@/app/borrow/actions";
import type { DiscoverBook } from "@/app/discover/discover.types";

export function DiscoverBookRow({ book }: { book: DiscoverBook }) {
  const [error, action, isPending] = useActionState(
    requestBorrowAction,
    null
  );
  const { status, borrowedByViewer, requestedByViewer } = book.availability;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">{book.title}</p>
          <p className="text-sm text-zinc-600">{book.author}</p>
          {book.notes && (
            <p className="mt-1 text-sm text-zinc-500">{book.notes}</p>
          )}
          <p className="mt-1 text-sm text-zinc-500">
            Owned by {book.owner.name}
          </p>
        </div>
        <div className="shrink-0">
          {/* Actual loan state wins over the viewer's pending request: a
              leftover request on a book that has since been lent to someone
              else must still read as "On loan", not "Requested". */}
          {status === "on_loan" ? (
            borrowedByViewer ? (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                Borrowed by you
              </span>
            ) : (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                On loan
              </span>
            )
          ) : requestedByViewer ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              Requested
            </span>
          ) : (
            <form action={action}>
              <input type="hidden" name="bookId" value={book.id} />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                Borrow
              </button>
            </form>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}
