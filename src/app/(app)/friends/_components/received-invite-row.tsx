"use client";

import { useActionState } from "react";
import { acceptInviteAction, rejectInviteAction } from "@/app/(app)/friends/actions";
import type { ReceivedInvite } from "@/app/(app)/friends/friends.types";
import { Card } from "@/app/_components/card";
import { Avatar } from "@/app/_components/avatar";
import { Pill } from "@/app/_components/pill";
import { Button } from "@/app/_components/button";

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
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={invite.otherUser.name} />
        <div>
          <p className="font-medium text-ink">{invite.otherUser.name}</p>
          <p className="text-sm text-ink-faint">{invite.otherUser.email}</p>
        </div>
      </div>
      <div className="self-start">
        <Pill tone="pending">Pending</Pill>
      </div>
      <div className="flex shrink-0 gap-2">
        <form action={acceptAction}>
          <input type="hidden" name="connectionId" value={invite.id} />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isAccepting || isRejecting}
          >
            Accept
          </Button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="connectionId" value={invite.id} />
          <Button
            type="submit"
            variant="decline"
            size="sm"
            disabled={isAccepting || isRejecting}
          >
            Reject
          </Button>
        </form>
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
    </Card>
  );
}
