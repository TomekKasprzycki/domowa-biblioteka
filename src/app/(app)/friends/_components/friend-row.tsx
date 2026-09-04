"use client";

import { useActionState, useRef, useState } from "react";
import { removeFriendAction } from "@/app/(app)/friends/actions";
import type { Friend } from "@/app/(app)/friends/friends.types";
import { Card } from "@/app/_components/card";
import { Avatar } from "@/app/_components/avatar";
import { Pill } from "@/app/_components/pill";
import { Button } from "@/app/_components/button";
import { IconButton } from "@/app/_components/icon-button";
import { ConfirmModal } from "@/app/_components/confirm-modal";
import { pluralizePl } from "@/lib/pluralize-pl.utils";

export function FriendRow({ friend }: { friend: Friend }) {
  const [error, removeAction, isPending] = useActionState(
    removeFriendAction,
    null
  );
  const { bookCount } = friend.otherUser;
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card as="li" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={friend.otherUser.name} />
        <div>
          <p className="font-medium text-ink">{friend.otherUser.name}</p>
          <p className="text-sm text-ink-faint">
            {bookCount} {pluralizePl(bookCount, ["książka", "książki", "książek"])} na półce
          </p>
        </div>
      </div>
      <div className="self-start">
        <Pill tone="active">Potwierdzony</Pill>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          href={`/discover?friend=${friend.otherUser.id}`}
        >
          Zobacz kolekcję
        </Button>
        <form ref={formRef} action={removeAction}>
          <input type="hidden" name="connectionId" value={friend.id} />
          <IconButton
            type="button"
            variant="decline"
            icon="🗑️"
            label={`Usuń ${friend.otherUser.name} ze znajomych`}
            disabled={isPending}
            onClick={() => setConfirmOpen(true)}
          />
        </form>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <ConfirmModal
        open={confirmOpen}
        title="Usuń znajomego"
        message={`Usunąć „${friend.otherUser.name}” ze znajomych?`}
        confirmLabel="Usuń"
        confirmVariant="decline"
        onConfirm={() => {
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
