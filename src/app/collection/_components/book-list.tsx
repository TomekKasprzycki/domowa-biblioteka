"use client";

import { useState } from "react";
import { BookRow } from "./book-row";
import { EditBookRow } from "./edit-book-row";

export type Book = {
  id: string;
  title: string;
  author: string;
  notes: string | null;
  createdAt: Date;
};

export function BookList({ books }: { books: Book[] }) {
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
