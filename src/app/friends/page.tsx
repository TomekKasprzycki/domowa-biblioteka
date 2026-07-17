import { auth } from "@/auth";
import {
  findPendingReceived,
  findPendingSent,
  findFriends,
} from "@/server/friend-connection/friend-connection.repository";
import type { FriendConnectionEntity } from "@/server/friend-connection/friend-connection.entity";
import { SendInviteForm } from "./_components/send-invite-form";
import { ReceivedInvitesList } from "./_components/received-invites-list";
import { FriendsList } from "./_components/friends-list";

function otherUserOf(
  connection: FriendConnectionEntity,
  currentUserId: string
) {
  return connection.requesterId === currentUserId
    ? connection.addressee
    : connection.requester;
}

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;
  const [received, sent, friends] = await Promise.all([
    findPendingReceived(userId),
    findPendingSent(userId),
    findFriends(userId),
  ]);

  const plainReceived = received.map((c) => ({
    id: c.id,
    otherUser: { email: c.requester.email, name: c.requester.name },
    createdAt: c.createdAt,
  }));
  const plainSent = sent.map((c) => ({
    id: c.id,
    otherUser: { email: c.addressee.email, name: c.addressee.name },
    createdAt: c.createdAt,
  }));
  const plainFriends = friends.map((c) => {
    const other = otherUserOf(c, userId);
    return {
      id: c.id,
      otherUser: { email: other.email, name: other.name },
      createdAt: c.createdAt,
    };
  });

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Friends
        </h1>
        <SendInviteForm />

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-zinc-900">Received</h2>
          <ReceivedInvitesList invites={plainReceived} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-zinc-900">Sent</h2>
          {plainSent.length === 0 ? (
            <p className="text-sm text-zinc-500">
              You haven&apos;t sent any invitations.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {plainSent.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-lg border border-zinc-200 p-4"
                >
                  <p className="font-medium text-zinc-900">
                    {invite.otherUser.name}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {invite.otherUser.email}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-zinc-900">Your friends</h2>
          <FriendsList friends={plainFriends} />
        </section>
      </div>
    </main>
  );
}
