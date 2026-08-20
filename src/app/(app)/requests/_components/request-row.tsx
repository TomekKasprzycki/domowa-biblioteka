"use client";

import { useActionState } from "react";
import {
  approveRequestAction,
  declineRequestAction,
} from "@/app/borrow/actions";
import { LibraryCard } from "@/app/_components/library-card";
import { Pill } from "@/app/_components/pill";
import { Button } from "@/app/_components/button";
import type { IncomingRequest } from "@/app/(app)/requests/requests.types";

// The mockup's meta line is a coarse relative-time stamp, not a live ticker —
// day granularity matches design.html's "REPORTED: 2 DAYS AGO" example.
function reportedAgo(date: Date): string {
  const diffDays = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

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
    <li>
      <LibraryCard
        stampLabel="Request"
        tone="default"
        title={request.book.title}
        subtitle={
          <>
            <span className="block">{request.book.author}</span>
            <span className="block">
              Requested by {request.requester.name}
            </span>
          </>
        }
        metaLabel={`REPORTED: ${reportedAgo(request.createdAt).toUpperCase()}`}
        pill={<Pill tone="pending">Pending</Pill>}
        actions={
          <>
            <form action={approveAction}>
              <input type="hidden" name="loanId" value={request.id} />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isApproving || isDeclining}
              >
                Approve
              </Button>
            </form>
            <form action={declineAction}>
              <input type="hidden" name="loanId" value={request.id} />
              <Button
                type="submit"
                variant="decline"
                size="sm"
                disabled={isApproving || isDeclining}
              >
                Decline
              </Button>
            </form>
          </>
        }
      />
      {approveError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {approveError}
        </p>
      )}
      {declineError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {declineError}
        </p>
      )}
    </li>
  );
}
