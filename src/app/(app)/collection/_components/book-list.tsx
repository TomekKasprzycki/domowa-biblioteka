"use client";

import { useState } from "react";
import { BookRow } from "@/app/(app)/collection/_components/book-row";
import { EditBookModal } from "@/app/(app)/collection/_components/edit-book-modal";
import type { CollectionBook } from "@/app/(app)/collection/collection.types";

export function BookList({ books }: { books: CollectionBook[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (books.length === 0) {
    return <p className="text-sm text-zinc-500">Your collection is empty.</p>;
  }

  // Resolved from the current books rather than held in state, so an edited
  // book's dialog reflects the revalidated row instead of a stale copy.
  const editingBook = books.find((book) => book.id === editingId) ?? null;

  return (
    <>
      <ul className="flex flex-col gap-3">
        {books.map((book) => (
          <BookRow
            key={book.id}
            book={book}
            onEdit={() => setEditingId(book.id)}
          />
        ))}
      </ul>

      {/* Keyed by book so switching rows remounts the form with the new
          defaultValues — the inputs are uncontrolled. */}
      {editingBook && (
        <EditBookModal
          key={editingBook.id}
          book={editingBook}
          onClose={() => setEditingId(null)}
        />
      )}
    </>
  );
}
