"use client";

import { useActionState, useRef, useState } from "react";
import { markReturnedAction } from "@/app/borrow/actions";
import { LibraryCard } from "@/app/_components/library-card";
import { Button } from "@/app/_components/button";
import { ConfirmModal } from "@/app/_components/confirm-modal";
import type { OutgoingLoan } from "@/app/(app)/borrowing/borrowing.types";

function statusLabel(loan: OutgoingLoan): string {
  const owner = loan.owner.name;
  switch (loan.status) {
    case "active":
      return `Wypożyczona od ${owner}`;
    case "return_pending":
      return `Zwrot w trakcie — czeka na potwierdzenie od ${owner}`;
    case "returned":
      return `Zwrócona do ${owner}`;
    case "declined":
      return `Odrzucona przez ${owner}`;
    default:
      return `Prośba wysłana do ${owner}`;
  }
}

export function BorrowingRow({ loan }: { loan: OutgoingLoan }) {
  const [error, action, isPending] = useActionState(markReturnedAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <li>
      <LibraryCard
        stampLabel="U Ciebie"
        tone="default"
        title={loan.book.title}
        subtitle={
          <>
            <span className="block">{loan.book.author}</span>
            <span className="block">{statusLabel(loan)}</span>
          </>
        }
        // Only an active loan can be returned. Once marked, there is no way
        // back — the owner's confirmation is the only forward move — so the
        // dialog is the single guard against a mis-click.
        actions={
          loan.status === "active" ? (
            <form ref={formRef} action={action}>
              <input type="hidden" name="loanId" value={loan.id} />
              <Button
                type="button"
                variant="outline-blue"
                size="sm"
                disabled={isPending}
                onClick={() => setConfirmOpen(true)}
              >
                Oznacz jako zwrócone
              </Button>
            </form>
          ) : undefined
        }
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <ConfirmModal
        open={confirmOpen}
        title="Potwierdź zwrot"
        message={`Potwierdzić zwrot „${loan.book.title}” do ${loan.owner.name}? Tej operacji nie można cofnąć.`}
        confirmLabel="Oznacz jako zwrócone"
        confirmVariant="outline-blue"
        onConfirm={() => {
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  );
}
