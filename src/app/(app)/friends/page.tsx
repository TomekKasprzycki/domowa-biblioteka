import { auth } from "@/auth";
import {
  findPendingReceived,
  findPendingSent,
  findFriends,
} from "@/server/friend-connection/friend-connection.repository";
import { countBooksForUser } from "@/server/book/book.repository";
import type { FriendConnectionEntity } from "@/server/friend-connection/friend-connection.entity";
import { ManageInvitesSection } from "@/app/(app)/friends/_components/manage-invites-section";
import { FriendsList } from "@/app/(app)/friends/_components/friends-list";
import { Section } from "@/app/_components/section";

function otherUserOf(
  connection: FriendConnectionEntity,
  currentUserId: string
) {
  return connection.requesterId === currentUserId
    ? connection.addressee
    : connection.requester;
}

interface FriendsPageProps {
  searchParams: Promise<{ notice?: string }>;
}

export default async function FriendsPage({ searchParams }: FriendsPageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const { notice } = await searchParams;

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
  const plainFriends = await Promise.all(
    friends.map(async (c) => {
      const other = otherUserOf(c, userId);
      const bookCount = await countBooksForUser(other.id);
      return {
        id: c.id,
        otherUser: {
          id: other.id,
          email: other.email,
          name: other.name,
          bookCount,
        },
        createdAt: c.createdAt,
      };
    })
  );

  return (
    <div className="flex flex-col gap-7">
      <div>
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-green-600">
          Krąg zaufania
        </span>
        <h1 className="font-display text-[30px] font-semibold text-ink">
          Znajomi
        </h1>
      </div>
      {notice === "not-a-friend" && (
        <p
          role="alert"
          className="rounded-card border border-amber-200 bg-amber-200/30 px-4 py-3 text-sm text-amber-700"
        >
          Nie masz połączenia z tym użytkownikiem.
        </p>
      )}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="lg:col-start-2 lg:row-start-1">
          <ManageInvitesSection received={plainReceived} sent={plainSent} />
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <Section title="Potwierdzeni znajomi" collapsible={false}>
            <FriendsList friends={plainFriends} />
          </Section>
        </div>
      </div>
    </div>
  );
}
