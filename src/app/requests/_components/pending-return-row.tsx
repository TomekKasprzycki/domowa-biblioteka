"use client";

import { useActionState } from "react";
import { confirmReturnAction } from "@/app/borrow/actions";
import type { PendingReturn } from "@/app/requests/requests.types";

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
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">
            {pendingReturn.book.title}
          </p>
          <p className="text-sm text-zinc-600">{pendingReturn.book.author}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {pendingReturn.requester.name} says they returned it
            {pendingReturn.startedAt &&
              ` · borrowed since ${dateFormat.format(pendingReturn.startedAt)}`}
          </p>
        </div>
        <div className="shrink-0">
          <form action={action}>
            <input type="hidden" name="loanId" value={pendingReturn.id} />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              I received it back
            </button>
          </form>
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
