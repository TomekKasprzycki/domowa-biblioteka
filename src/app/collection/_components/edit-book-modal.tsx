"use client";

import { useActionState, useCallback, useRef } from "react";
import { Modal } from "@/app/_components/modal";
import { updateBookAction } from "@/app/collection/actions";
import { useActionSuccess } from "@/lib/use-action-success.utils";
import type { CollectionBook } from "@/app/collection/collection.types";

const DISCARD_PROMPT = "Discard your changes to this book?";

export function EditBookModal({
  book,
  onClose,
}: {
  book: CollectionBook;
  onClose: () => void;
}) {
  const [error, formAction, isPending] = useActionState(updateBookAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useActionSuccess(isPending, error, onClose);

  // Compared against the book rather than a "touched" flag: typing a character
  // and deleting it again should not count as a change worth warning about.
  const isDirty = useCallback(() => {
    const form = formRef.current;
    if (!form) return false;
    const data = new FormData(form);
    return (
      data.get("title") !== book.title ||
      data.get("author") !== book.author ||
      data.get("notes") !== (book.notes ?? "")
    );
  }, [book]);

  const canClose = useCallback(
    () => !isDirty() || window.confirm(DISCARD_PROMPT),
    [isDirty]
  );

  const requestClose = useCallback(() => {
    if (canClose()) onClose();
  }, [canClose, onClose]);

  return (
    <Modal open onClose={onClose} title="Edit book" canClose={canClose}>
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
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
            onClick={requestClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
