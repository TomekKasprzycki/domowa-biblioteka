import { ReceivedInviteRow } from "./received-invite-row";

export type ReceivedInvite = {
  id: string;
  otherUser: { email: string; name: string };
  createdAt: Date;
};

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
