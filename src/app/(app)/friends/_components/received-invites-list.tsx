import { ReceivedInviteRow } from "@/app/(app)/friends/_components/received-invite-row";
import type { ReceivedInvite } from "@/app/(app)/friends/friends.types";
import { EmptyNote } from "@/app/_components/empty-note";

export function ReceivedInvitesList({
  invites,
}: {
  invites: ReceivedInvite[];
}) {
  if (invites.length === 0) {
    return <EmptyNote>Brak oczekujących zaproszeń.</EmptyNote>;
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
      {invites.map((invite) => (
        <ReceivedInviteRow key={invite.id} invite={invite} />
      ))}
    </ul>
  );
}
