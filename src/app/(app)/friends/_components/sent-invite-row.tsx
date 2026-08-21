import type { SentInvite } from "@/app/(app)/friends/friends.types";
import { Card } from "@/app/_components/card";
import { Avatar } from "@/app/_components/avatar";
import { Pill } from "@/app/_components/pill";

export function SentInviteRow({ invite }: { invite: SentInvite }) {
  return (
    <Card as="li" className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={invite.otherUser.name} />
        <div>
          <p className="font-medium text-ink">{invite.otherUser.name}</p>
          <p className="text-sm text-ink-faint">{invite.otherUser.email}</p>
        </div>
      </div>
      <Pill tone="pending">Pending</Pill>
    </Card>
  );
}
