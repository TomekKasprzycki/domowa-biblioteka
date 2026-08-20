"use client";

import { useActionState } from "react";
import { requestBorrowAction } from "@/app/borrow/actions";
import { Card } from "@/app/_components/card";
import { Pill } from "@/app/_components/pill";
import { Button } from "@/app/_components/button";
import type { DiscoverBook } from "@/app/(app)/discover/discover.types";

export function DiscoverBookRow({ book }: { book: DiscoverBook }) {
  const [error, action, isPending] = useActionState(
    requestBorrowAction,
    null
  );
  const { status, borrowedByViewer, requestedByViewer } = book.availability;

  return (
    <Card as="li" className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-ink">{book.title}</p>
          <p className="text-sm text-ink-soft">{book.author}</p>
          {book.notes && (
            <p className="mt-1 text-sm text-ink-faint">{book.notes}</p>
          )}
          <p className="mt-1 text-sm text-ink-faint">
            Owned by {book.owner.name}
          </p>
        </div>
        <div className="shrink-0">
          {/* Actual loan state wins over the viewer's pending request: a
              leftover request on a book that has since been lent to someone
              else must still read as "On loan", not "Requested". */}
          {status === "on_loan" ? (
            borrowedByViewer ? (
              <Pill tone="pending">Borrowed by you</Pill>
            ) : (
              <Pill tone="pending">On loan</Pill>
            )
          ) : requestedByViewer ? (
            <Pill tone="pending">Requested</Pill>
          ) : (
            <form action={action}>
              <input type="hidden" name="bookId" value={book.id} />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isPending}
              >
                Borrow
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
