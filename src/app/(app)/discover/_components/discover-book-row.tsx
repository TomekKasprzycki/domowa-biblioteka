"use client";

import { useActionState, useState } from "react";
import { requestBorrowAction } from "@/app/borrow/actions";
import { Pill } from "@/app/_components/pill";
import { Button } from "@/app/_components/button";
import { Spine } from "@/app/_components/spine";
import { Drawer } from "@/app/_components/drawer";
import { spineStyleFor } from "@/lib/spine-style.utils";
import type { DiscoverBook } from "@/app/(app)/discover/discover.types";

export function DiscoverBookRow({ book }: { book: DiscoverBook }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, action, isPending] = useActionState(
    requestBorrowAction,
    null
  );
  const { status, borrowedByViewer, requestedByViewer } = book.availability;

  // Actual loan state wins over the viewer's pending request: a leftover
  // request on a book that has since been lent to someone else must still
  // read as "On loan", not "Requested".
  const tag =
    status === "on_loan"
      ? borrowedByViewer
        ? "U Ciebie"
        : "Wypożyczona"
      : requestedByViewer
        ? "Zgłoszono"
        : undefined;

  return (
    // Shelf renders as role="list" (see shelf.tsx); each row is one
    // listitem so assistive tech announces the book count and each
    // book's position, matching the <ul>/<li> semantics the previous
    // Card-row layout had for free. The Drawer's <dialog> is
    // position:fixed and unaffected by this wrapper.
    <div role="listitem">
      <Spine
        title={book.title}
        author={book.author}
        isbn={book.isbn}
        owner={book.owner.name}
        tag={tag}
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
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-ink-faint">
              Właściciel: {book.owner.name}
            </p>
            <Pill tone={tag ? "pending" : "active"}>{tag ?? "Dostępna"}</Pill>
          </div>
        }
        actionsSlot={
          <>
            {!tag && (
              <form action={action}>
                <input type="hidden" name="bookId" value={book.id} />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isPending}
                >
                  Poproś o wypożyczenie
                </Button>
              </form>
            )}
            {status === "on_loan" && !borrowedByViewer && (
              <p className="text-center text-sm text-ink-faint">
                Będzie znów dostępna po zwrocie.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </>
        }
      />
    </div>
  );
}
