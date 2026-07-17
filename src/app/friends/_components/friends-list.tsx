import { FriendRow } from "@/app/friends/_components/friend-row";
import type { Friend } from "@/app/friends/friends.types";

export function FriendsList({ friends }: { friends: Friend[] }) {
  if (friends.length === 0) {
    return <p className="text-sm text-zinc-500">You have no friends yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {friends.map((friend) => (
        <FriendRow key={friend.id} friend={friend} />
      ))}
    </ul>
  );
}
