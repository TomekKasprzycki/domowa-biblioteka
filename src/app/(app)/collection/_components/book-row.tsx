"use client";

import { useActionState, useState } from "react";
import { deleteBookAction } from "@/app/(app)/collection/actions";
import type { CollectionBook } from "@/app/(app)/collection/collection.types";
import { Spine } from "@/app/_components/spine";
import { Drawer } from "@/app/_components/drawer";
import { Button } from "@/app/_components/button";
import { spineStyleFor } from "@/lib/spine-style.utils";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, deleteAction, isPending] = useActionState(
    deleteBookAction,
    null
  );

  return (
    <>
      <Spine
        title={book.title}
        author={book.author}
        isbn={book.isbn}
        onClick={() => setDrawerOpen(true)}
      />
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        spineColor={spineStyleFor(book.title).color}
        title={book.title}
        author={book.author}
        isbn={book.isbn}
        statusSlot={
          book.notes || book.loan ? (
            <div className="flex flex-col items-center gap-1">
              {book.notes && (
                <p className="text-sm text-ink-faint">{book.notes}</p>
              )}
              {book.loan && (
                <p className="text-sm font-medium text-blue-700">
                  {loanLabel(book.loan)}
                </p>
              )}
            </div>
          ) : undefined
        }
        actionsSlot={
          <>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setDrawerOpen(false);
                onEdit();
              }}
            >
              Edit
            </Button>
            {/* Deleting a book that is out would orphan the borrower's loan
                row, and the FK refuses it anyway. Hiding the control makes
                the rule visible; the server action is what actually
                enforces it. */}
            {!book.loan && (
              <form action={deleteAction}>
                <input type="hidden" name="bookId" value={book.id} />
                <Button
                  type="submit"
                  variant="decline"
                  className="w-full"
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
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </>
        }
      />
    </>
  );
}
