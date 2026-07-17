"use client";

import { useActionState } from "react";
import { removeFriendAction } from "@/app/friends/actions";
import type { Friend } from "@/app/friends/friends.types";

export function FriendRow({ friend }: { friend: Friend }) {
  const [error, removeAction, isPending] = useActionState(
    removeFriendAction,
    null
  );

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">{friend.otherUser.name}</p>
          <p className="text-sm text-zinc-600">{friend.otherUser.email}</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <form action={removeAction}>
            <input type="hidden" name="connectionId" value={friend.id} />
            <button
              type="submit"
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
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Remove
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
