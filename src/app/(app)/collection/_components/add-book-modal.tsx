"use client";

import { useCallback, useRef, useState } from "react";
import { Modal } from "@/app/_components/modal";
import { ConfirmModal } from "@/app/_components/confirm-modal";
import { AddBookForm } from "@/app/(app)/collection/_components/add-book-form";
import { Button } from "@/app/_components/button";

const DISCARD_PROMPT = "Odrzucić tę książkę? Wpisane dane zostaną utracone.";

export function AddBookModal() {
  const [open, setOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Read the live DOM for the dirty check rather than tracking it separately.
  // Checkboxes are excluded: a checkbox's .value is the string "on"
  // regardless of checked state, so the confirmation checkbox added in S-07
  // would otherwise read as permanent dirt and fire the discard prompt on
  // every dismissal, even an untouched one.
  const isDirty = useCallback(() => {
    const fields = formRef.current?.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement
    >("input:not([type=checkbox]), textarea");
    return Array.from(fields ?? []).some((field) => field.value.trim() !== "");
  }, []);

  // Always vetoes a dismissal while dirty (Modal's canClose is synchronous,
  // so it can't await the confirm modal's result) — the discard-confirm
  // modal opened as a side effect here is what actually decides the close.
  const canClose = useCallback(() => {
    if (!isDirty()) return true;
    setDiscardConfirmOpen(true);
    return false;
  }, [isDirty]);

  const requestClose = useCallback(() => {
    if (canClose()) close();
  }, [canClose, close]);

  return (
    <div className="self-start">
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        Dodaj książkę
      </Button>

      <Modal open={open} onClose={close} title="Dodaj książkę" canClose={canClose}>
        {/* Remounted on every open so a reopened dialog starts empty. Title,
            author and ISBN are controlled state now (S-07), and notes stays
            uncontrolled; the remount resets both kinds alike. */}
        <div ref={formRef} key={String(open)}>
          <AddBookForm onSaved={close} onCancel={requestClose} />
        </div>
      </Modal>
      <ConfirmModal
        open={discardConfirmOpen}
        title="Odrzuć książkę"
        message={DISCARD_PROMPT}
        confirmLabel="Odrzuć"
        confirmVariant="decline"
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          close();
        }}
        onCancel={() => setDiscardConfirmOpen(false)}
      />
    </div>
  );
}
