"use client";

import { useState } from "react";
import { DiscoverBookRow } from "@/app/discover/_components/discover-book-row";
import type { DiscoverBook, DiscoverFriend } from "@/app/discover/discover.types";

export function DiscoverSearch({
  books,
  friends,
  initialFriendId,
}: {
  books: DiscoverBook[];
  friends: DiscoverFriend[];
  initialFriendId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [friendFilter, setFriendFilter] = useState<string | null>(
    initialFriendId
  );

  if (friends.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        You have no confirmed friends yet. Connect with friends to browse their
        collections.
      </p>
    );
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matches = books.filter((book) => {
    const matchesQuery =
      normalizedQuery === "" ||
      book.title.toLowerCase().includes(normalizedQuery) ||
      book.author.toLowerCase().includes(normalizedQuery);
    const matchesFriend =
      friendFilter === null || book.owner.id === friendFilter;
    return matchesQuery && matchesFriend;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or author"
          aria-label="Search by title or author"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
        />
        <select
          value={friendFilter ?? ""}
          onChange={(e) => setFriendFilter(e.target.value || null)}
          aria-label="Filter by friend"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
        >
          <option value="">All friends</option>
          {friends.map((friend) => (
            <option key={friend.id} value={friend.id}>
              {friend.name}
            </option>
          ))}
        </select>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No books match your search.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((book) => (
            <DiscoverBookRow key={book.id} book={book} />
          ))}
        </ul>
      )}
    </div>
  );
}
