"use client";

import { useActionState } from "react";
import { deleteBookAction } from "@/app/(app)/collection/actions";
import type { CollectionBook } from "@/app/(app)/collection/collection.types";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function loanLabel(loan: NonNullable<CollectionBook["loan"]>): string {
  const since = loan.startedAt
    ? ` · since ${dateFormat.format(loan.startedAt)}`
    : "";
  return loan.status === "return_pending"
    ? `Return pending · ${loan.borrowerName}${since}`
    : `Lent to ${loan.borrowerName}${since}`;
}

export function BookRow({
  book,
  onEdit,
}: {
  book: CollectionBook;
  onEdit: () => void;
}) {
  const [error, deleteAction, isPending] = useActionState(
    deleteBookAction,
    null
  );

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">{book.title}</p>
          <p className="text-sm text-zinc-600">{book.author}</p>
          {book.notes && (
            <p className="mt-1 text-sm text-zinc-500">{book.notes}</p>
          )}
          {book.loan && (
            <p className="mt-1 text-sm font-medium text-blue-700">
              {loanLabel(book.loan)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-zinc-900 hover:underline"
          >
            Edit
          </button>
          {/* Deleting a book that is out would orphan the borrower's loan row,
              and the FK refuses it anyway. Hiding the control makes the rule
              visible; the server action is what actually enforces it. */}
          {!book.loan && (
            <form action={deleteAction}>
              <input type="hidden" name="bookId" value={book.id} />
              <button
                type="submit"
                disabled={isPending}
                onClick={(e) => {
                  if (!window.confirm(`Delete "${book.title}"?`)) {
                    e.preventDefault();
                  }
                }}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Delete
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
