import { FriendRow } from "./friend-row";

export type Friend = {
  id: string;
  otherUser: { email: string; name: string };
  createdAt: Date;
};

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
