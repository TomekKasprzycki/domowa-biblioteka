import { FriendRow } from "@/app/(app)/friends/_components/friend-row";
import type { Friend } from "@/app/(app)/friends/friends.types";
import { EmptyNote } from "@/app/_components/empty-note";

export function FriendsList({ friends }: { friends: Friend[] }) {
  if (friends.length === 0) {
    return <EmptyNote>You have no friends yet.</EmptyNote>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {friends.map((friend) => (
        <FriendRow key={friend.id} friend={friend} />
      ))}
    </ul>
  );
}
