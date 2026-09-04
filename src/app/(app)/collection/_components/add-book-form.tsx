"use client";

import { useActionState, useState } from "react";
import { addBookAction } from "@/app/(app)/collection/actions";
import { lookupIsbn } from "@/app/(app)/collection/isbn-lookup.client";
import { useActionSuccess } from "@/lib/use-action-success.utils";
import { normalizeIsbn } from "@/lib/normalize-isbn.utils";
import { Field } from "@/app/_components/field";
import { Button } from "@/app/_components/button";

type LookupStatus =
  | "idle"
  | "searching"
  | "found"
  | "not-found"
  | "session-expired"
  | "error";

const STATUS_MESSAGES: Record<LookupStatus, string> = {
  idle: "",
  searching: "Szukam w Open Library…",
  found: "✓ Znaleziono — pola są nadal edytowalne.",
  "not-found": "Nie znaleziono. Wpisz dane ręcznie.",
  "session-expired":
    "Twoja sesja wygasła. Odśwież stronę i zaloguj się, aby wyszukać ISBN.",
  error: "Coś poszło nie tak. Wpisz dane ręcznie.",
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
    <form action={formAction} className="flex flex-col gap-1">
      <div className="mb-3.5">
        <label
          htmlFor="isbn"
          className="mb-1.5 block font-mono text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft"
        >
          ISBN (opcjonalnie)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="isbn"
            type="text"
            name="isbn"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            className="flex-1 rounded-[7px] border border-line px-3 py-2.5 text-sm text-ink focus:border-green-500 focus:outline-none"
          />
          <Button
            type="button"
            variant="outline-blue"
            size="sm"
            onClick={handleLookup}
          >
            Wyszukaj
          </Button>
        </div>
        <p role="status" className="mt-1.5 min-h-4 text-xs text-ink-faint">
          {STATUS_MESSAGES[lookupStatus]}
        </p>
      </div>

      <Field
        label="Tytuł"
        id="title"
        name="title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <Field
        label="Autor"
        id="author"
        name="author"
        required
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
      />

      <Field as="textarea" label="Notatki (opcjonalnie)" id="notes" name="notes" rows={2} />

      {isFromLookup && (
        <label className="mb-2 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          To właściwa książka — tytuł i autor są poprawne.
        </label>
      )}

      {error && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={submitDisabled}>
          {isPending ? "Zapisywanie…" : "Zapisz książkę"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}
