import { SentInviteRow } from "@/app/(app)/friends/_components/sent-invite-row";
import type { SentInvite } from "@/app/(app)/friends/friends.types";
import { EmptyNote } from "@/app/_components/empty-note";

export function SentInvitesList({ invites }: { invites: SentInvite[] }) {
  if (invites.length === 0) {
    return <EmptyNote>You haven&apos;t sent any invitations.</EmptyNote>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {invites.map((invite) => (
        <SentInviteRow key={invite.id} invite={invite} />
      ))}
    </ul>
  );
}
