"use client";

import { useState } from "react";
import { DiscoverBookRow } from "@/app/(app)/discover/_components/discover-book-row";
import { EmptyNote } from "@/app/_components/empty-note";
import { Shelf } from "@/app/_components/shelf";
import type { DiscoverBook, DiscoverFriend } from "@/app/(app)/discover/discover.types";

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
      <EmptyNote>
        Nie masz jeszcze potwierdzonych znajomych. Połącz się ze znajomymi,
        aby przeglądać ich kolekcje.
      </EmptyNote>
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
          placeholder="Szukaj po tytule lub autorze…"
          aria-label="Szukaj po tytule lub autorze"
          className="flex-1 rounded-lg border border-line bg-paper-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-green-500 focus:outline-none"
        />
        <select
          value={friendFilter ?? ""}
          onChange={(e) => setFriendFilter(e.target.value || null)}
          aria-label="Filtruj według znajomego"
          className="rounded-lg border border-line bg-paper-card px-3 py-2 text-sm text-ink focus:border-green-500 focus:outline-none"
        >
          <option value="">Wszyscy znajomi</option>
          {friends.map((friend) => (
            <option key={friend.id} value={friend.id}>
              {friend.name}
            </option>
          ))}
        </select>
      </div>

      {matches.length === 0 ? (
        <EmptyNote>Brak książek pasujących do szukanej frazy.</EmptyNote>
      ) : (
        <Shelf>
          {matches.map((book) => (
            <DiscoverBookRow key={book.id} book={book} />
          ))}
        </Shelf>
      )}
    </div>
  );
}
