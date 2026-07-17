import { ReceivedInviteRow } from "@/app/friends/_components/received-invite-row";
import type { ReceivedInvite } from "@/app/friends/friends.types";

export function ReceivedInvitesList({
  invites,
}: {
  invites: ReceivedInvite[];
}) {
  if (invites.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No pending invitations.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {invites.map((invite) => (
        <ReceivedInviteRow key={invite.id} invite={invite} />
      ))}
    </ul>
  );
}
