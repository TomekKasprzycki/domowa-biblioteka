"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateBookAction } from "../actions";
import type { Book } from "./book-list";

export function EditBookRow({
  book,
  onCancel,
  onSaved,
}: {
  book: Book;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [error, formAction, isPending] = useActionState(
    updateBookAction,
    null
  );

  // useActionState has no built-in "on success" callback, so detect it by
  // watching for the pending -> not-pending transition with no error. The
  // wasPending ref keeps this from firing on initial mount, where isPending
  // starts false too.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      onSaved();
    }
    wasPending.current = isPending;
  }, [isPending, error, onSaved]);

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-300 p-4">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="bookId" value={book.id} />

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`title-${book.id}`}
            className="text-sm font-medium text-zinc-700"
          >
            Title
          </label>
          <input
            id={`title-${book.id}`}
            type="text"
            name="title"
            required
            defaultValue={book.title}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`author-${book.id}`}
            className="text-sm font-medium text-zinc-700"
          >
            Author
          </label>
          <input
            id={`author-${book.id}`}
            type="text"
            name="author"
            required
            defaultValue={book.author}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`notes-${book.id}`}
            className="text-sm font-medium text-zinc-700"
          >
            Notes (optional)
          </label>
          <textarea
            id={`notes-${book.id}`}
            name="notes"
            rows={2}
            defaultValue={book.notes ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
