import { SentInviteRow } from "@/app/(app)/friends/_components/sent-invite-row";
import type { SentInvite } from "@/app/(app)/friends/friends.types";
import { EmptyNote } from "@/app/_components/empty-note";

export function SentInvitesList({ invites }: { invites: SentInvite[] }) {
  if (invites.length === 0) {
    return <EmptyNote>Nie wysłano jeszcze żadnych zaproszeń.</EmptyNote>;
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
      {invites.map((invite) => (
        <SentInviteRow key={invite.id} invite={invite} />
      ))}
    </ul>
  );
}
