"use client";

import { useActionState } from "react";
import { confirmReturnAction } from "@/app/borrow/actions";
import { LibraryCard } from "@/app/_components/library-card";
import { Button } from "@/app/_components/button";
import type { PendingReturn } from "@/app/(app)/requests/requests.types";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function PendingReturnRow({
  pendingReturn,
}: {
  pendingReturn: PendingReturn;
}) {
  const [error, action, isPending] = useActionState(confirmReturnAction, null);

  return (
    <li>
      <LibraryCard
        stampLabel="Return"
        tone="pending-return"
        title={pendingReturn.book.title}
        subtitle={
          <>
            <span className="block">{pendingReturn.book.author}</span>
            <span className="block">
              {pendingReturn.requester.name} says they returned it
              {pendingReturn.startedAt &&
                ` · borrowed since ${dateFormat.format(pendingReturn.startedAt)}`}
            </span>
          </>
        }
        actions={
          <form action={action}>
            <input type="hidden" name="loanId" value={pendingReturn.id} />
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>
              I received it back
            </Button>
          </form>
        }
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}
