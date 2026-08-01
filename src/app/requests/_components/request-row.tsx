"use client";

import { useActionState } from "react";
import {
  approveRequestAction,
  declineRequestAction,
} from "@/app/borrow/actions";
import type { IncomingRequest } from "@/app/requests/requests.types";

export function RequestRow({ request }: { request: IncomingRequest }) {
  const [approveError, approveAction, isApproving] = useActionState(
    approveRequestAction,
    null
  );
  const [declineError, declineAction, isDeclining] = useActionState(
    declineRequestAction,
    null
  );

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">{request.book.title}</p>
          <p className="text-sm text-zinc-600">{request.book.author}</p>
          <p className="mt-1 text-sm text-zinc-500">
            Requested by {request.requester.name}
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <form action={approveAction}>
            <input type="hidden" name="loanId" value={request.id} />
            <button
              type="submit"
              disabled={isApproving || isDeclining}
              className="text-sm font-medium text-zinc-900 hover:underline disabled:opacity-50"
            >
              Approve
            </button>
          </form>
          <form action={declineAction}>
            <input type="hidden" name="loanId" value={request.id} />
            <button
              type="submit"
              disabled={isApproving || isDeclining}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Decline
            </button>
          </form>
        </div>
      </div>
      {approveError && (
        <p role="alert" className="text-sm text-red-600">
          {approveError}
        </p>
      )}
      {declineError && (
        <p role="alert" className="text-sm text-red-600">
          {declineError}
        </p>
      )}
    </li>
  );
}
