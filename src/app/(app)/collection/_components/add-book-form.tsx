"use client";

import { useActionState, useState } from "react";
import { addBookAction } from "@/app/(app)/collection/actions";
import { lookupIsbn } from "@/app/(app)/collection/isbn-lookup.client";
import { useActionSuccess } from "@/lib/use-action-success.utils";
import { normalizeIsbn } from "@/lib/normalize-isbn.utils";

type LookupStatus =
  | "idle"
  | "searching"
  | "found"
  | "not-found"
  | "session-expired"
  | "error";

const STATUS_MESSAGES: Record<LookupStatus, string> = {
  idle: "",
  searching: "Searching Open Library…",
  found: "✓ Found — fields are still editable.",
  "not-found": "Not found. Type the details in manually.",
  "session-expired":
    "Your session has expired. Reload and sign in to look up an ISBN.",
  error: "Something went wrong. Type the details in manually.",
};

export function AddBookForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [error, formAction, isPending] = useActionState(addBookAction, null);

  useActionSuccess(isPending, error, onSaved);

  const [isbn, setIsbn] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  // Provenance is per-attempt, not per-field: once a lookup fills the form,
  // the confirmation gate applies to that submission regardless of further
  // edits. Only the modal's remount-on-reopen clears it.
  const [isFromLookup, setIsFromLookup] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleLookup() {
    const normalized = normalizeIsbn(isbn);
    if (!normalized) {
      setLookupStatus("not-found");
      return;
    }

    setLookupStatus("searching");
    const result = await lookupIsbn(normalized);

    if (result.status === "found") {
      setTitle(result.title);
      setAuthor(result.author ?? "");
      setIsFromLookup(true);
      setConfirmed(false);
      setLookupStatus("found");
    } else if (result.status === "unauthenticated") {
      setLookupStatus("session-expired");
    } else if (result.status === "error") {
      setLookupStatus("error");
    } else {
      setLookupStatus("not-found");
    }
  }

  const submitDisabled = isPending || (isFromLookup && !confirmed);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="isbn" className="text-sm font-medium text-zinc-700">
          ISBN (optional)
        </label>
        <div className="flex gap-2">
          <input
            id="isbn"
            type="text"
            name="isbn"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <button
            type="button"
            onClick={handleLookup}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Look up
          </button>
        </div>
        <p role="status" className="min-h-4 text-xs text-zinc-500">
          {STATUS_MESSAGES[lookupStatus]}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium text-zinc-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="author" className="text-sm font-medium text-zinc-700">
          Author
        </label>
        <input
          id="author"
          type="text"
          name="author"
          required
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium text-zinc-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
      </div>

      {isFromLookup && (
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          This is the right book — title and author are correct.
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitDisabled}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add"}
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
  );
}
