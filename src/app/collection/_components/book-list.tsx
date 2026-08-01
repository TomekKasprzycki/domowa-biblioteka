"use client";

import { useState } from "react";
import { BookRow } from "@/app/collection/_components/book-row";
import { EditBookRow } from "@/app/collection/_components/edit-book-row";
import type { CollectionBook } from "@/app/collection/collection.types";

export function BookList({ books }: { books: CollectionBook[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (books.length === 0) {
    return <p className="text-sm text-zinc-500">Your collection is empty.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {books.map((book) =>
        book.id === editingId ? (
          <EditBookRow
            key={book.id}
            book={book}
            onCancel={() => setEditingId(null)}
            onSaved={() => setEditingId(null)}
          />
        ) : (
          <BookRow
            key={book.id}
            book={book}
            onEdit={() => setEditingId(book.id)}
          />
        )
      )}
    </ul>
  );
}
