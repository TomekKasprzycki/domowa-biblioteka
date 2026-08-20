"use client";

import { useActionState } from "react";
import { removeFriendAction } from "@/app/(app)/friends/actions";
import type { Friend } from "@/app/(app)/friends/friends.types";
import { Card } from "@/app/_components/card";
import { Avatar } from "@/app/_components/avatar";
import { Pill } from "@/app/_components/pill";
import { Button } from "@/app/_components/button";

export function FriendRow({ friend }: { friend: Friend }) {
  const [error, removeAction, isPending] = useActionState(
    removeFriendAction,
    null
  );

  return (
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={friend.otherUser.name} />
          <div>
            <p className="font-medium text-ink">{friend.otherUser.name}</p>
            <p className="text-sm text-ink-faint">{friend.otherUser.email}</p>
          </div>
        </div>
        <Pill tone="active">Confirmed</Pill>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="ghost"
          size="sm"
          href={`/discover?friend=${friend.otherUser.id}`}
        >
          View collection
        </Button>
        <form action={removeAction}>
          <input type="hidden" name="connectionId" value={friend.id} />
          <Button
            type="submit"
            variant="decline"
            size="sm"
            disabled={isPending}
            onClick={(e) => {
              if (
                !window.confirm(
                  `Remove "${friend.otherUser.name}" as a friend?`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            Remove
          </Button>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </Card>
  );
}
