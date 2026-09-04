"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { Modal } from "@/app/_components/modal";
import { ConfirmModal } from "@/app/_components/confirm-modal";
import { updateBookAction } from "@/app/(app)/collection/actions";
import { useActionSuccess } from "@/lib/use-action-success.utils";
import type { CollectionBook } from "@/app/(app)/collection/collection.types";
import { Field } from "@/app/_components/field";
import { Button } from "@/app/_components/button";

const DISCARD_PROMPT = "Odrzucić zmiany w tej książce?";

export function EditBookModal({
  book,
  onClose,
}: {
  book: CollectionBook;
  onClose: () => void;
}) {
  const [error, formAction, isPending] = useActionState(updateBookAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

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

  // Always vetoes a dismissal while dirty (Modal's canClose is synchronous,
  // so it can't await the confirm modal's result) — the discard-confirm
  // modal opened as a side effect here is what actually decides the close.
  const canClose = useCallback(() => {
    if (!isDirty()) return true;
    setDiscardConfirmOpen(true);
    return false;
  }, [isDirty]);

  const requestClose = useCallback(() => {
    if (canClose()) onClose();
  }, [canClose, onClose]);

  return (
    <>
      <Modal open onClose={onClose} title="Edytuj książkę" canClose={canClose}>
        <form ref={formRef} action={formAction} className="flex flex-col gap-1">
          <input type="hidden" name="bookId" value={book.id} />

          <Field
            label="Tytuł"
            id={`title-${book.id}`}
            name="title"
            required
            defaultValue={book.title}
          />

          <Field
            label="Autor"
            id={`author-${book.id}`}
            name="author"
            required
            defaultValue={book.author}
          />

          <Field
            as="textarea"
            label="Notatki (opcjonalnie)"
            id={`notes-${book.id}`}
            name="notes"
            rows={2}
            defaultValue={book.notes ?? ""}
          />

          {error && (
            <p role="alert" className="mb-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Zapisywanie…" : "Zapisz"}
            </Button>
            <Button type="button" variant="ghost" onClick={requestClose}>
              Anuluj
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        open={discardConfirmOpen}
        title="Odrzuć zmiany"
        message={DISCARD_PROMPT}
        confirmLabel="Odrzuć"
        confirmVariant="decline"
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          onClose();
        }}
        onCancel={() => setDiscardConfirmOpen(false)}
      />
    </>
  );
}
