"use client";

import { useCallback, useRef, useState } from "react";
import { Modal } from "@/app/_components/modal";
import { AddBookForm } from "@/app/collection/_components/add-book-form";

const DISCARD_PROMPT = "Discard this book? What you've typed will be lost.";

export function AddBookModal() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Read the live DOM rather than mirroring every field in state: the form's
  // inputs are uncontrolled, and a dirty check is the only thing that needs
  // their values.
  const isDirty = useCallback(() => {
    const fields = formRef.current?.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement
    >("input, textarea");
    return Array.from(fields ?? []).some((field) => field.value.trim() !== "");
  }, []);

  const canClose = useCallback(
    () => !isDirty() || window.confirm(DISCARD_PROMPT),
    [isDirty]
  );

  const requestClose = useCallback(() => {
    if (canClose()) close();
  }, [canClose, close]);

  return (
    <div className="self-start">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Add book
      </button>

      <Modal open={open} onClose={close} title="Add book" canClose={canClose}>
        {/* Remounted on every open so a reopened dialog starts empty — the
            form is uncontrolled, so nothing else resets its fields. */}
        <div ref={formRef} key={String(open)}>
          <AddBookForm onSaved={close} onCancel={requestClose} />
        </div>
      </Modal>
    </div>
  );
}
