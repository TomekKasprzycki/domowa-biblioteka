"use client";

import { useActionState } from "react";
import { deleteBookAction } from "@/app/(app)/collection/actions";
import type { CollectionBook } from "@/app/(app)/collection/collection.types";
import { Card } from "@/app/_components/card";
import { Button } from "@/app/_components/button";

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
    <Card as="li" className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-ink">{book.title}</p>
          <p className="text-sm text-ink-soft">{book.author}</p>
          {book.notes && (
            <p className="mt-1 text-sm text-ink-faint">{book.notes}</p>
          )}
          {book.loan && (
            <p className="mt-1 text-sm font-medium text-blue-700">
              {loanLabel(book.loan)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          {/* Deleting a book that is out would orphan the borrower's loan row,
              and the FK refuses it anyway. Hiding the control makes the rule
              visible; the server action is what actually enforces it. */}
          {!book.loan && (
            <form action={deleteAction}>
              <input type="hidden" name="bookId" value={book.id} />
              <Button
                type="submit"
                variant="decline"
                size="sm"
                disabled={isPending}
                onClick={(e) => {
                  if (!window.confirm(`Delete "${book.title}"?`)) {
                    e.preventDefault();
                  }
                }}
              >
                Delete
              </Button>
            </form>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </Card>
  );
}
