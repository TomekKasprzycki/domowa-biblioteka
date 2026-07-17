"use client";

import { useActionState } from "react";
import { acceptInviteAction, rejectInviteAction } from "@/app/friends/actions";
import type { ReceivedInvite } from "@/app/friends/friends.types";

export function ReceivedInviteRow({ invite }: { invite: ReceivedInvite }) {
  const [acceptError, acceptAction, isAccepting] = useActionState(
    acceptInviteAction,
    null
  );
  const [rejectError, rejectAction, isRejecting] = useActionState(
    rejectInviteAction,
    null
  );

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">{invite.otherUser.name}</p>
          <p className="text-sm text-zinc-600">{invite.otherUser.email}</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <form action={acceptAction}>
            <input type="hidden" name="connectionId" value={invite.id} />
            <button
              type="submit"
              disabled={isAccepting || isRejecting}
              className="text-sm font-medium text-zinc-900 hover:underline disabled:opacity-50"
            >
              Accept
            </button>
          </form>
          <form action={rejectAction}>
            <input type="hidden" name="connectionId" value={invite.id} />
            <button
              type="submit"
              disabled={isAccepting || isRejecting}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Reject
            </button>
          </form>
        </div>
      </div>
      {acceptError && (
        <p role="alert" className="text-sm text-red-600">
          {acceptError}
        </p>
      )}
      {rejectError && (
        <p role="alert" className="text-sm text-red-600">
          {rejectError}
        </p>
      )}
    </li>
  );
}
