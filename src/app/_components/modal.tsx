"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  canClose,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /**
   * Consulted before a *user-initiated* dismissal (Esc or a backdrop click).
   * Returning false vetoes it — used to guard a half-filled form. Programmatic
   * closes bypass this entirely, so a successful save always closes.
   */
  canClose?: () => boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // <dialog> is only modal when opened imperatively — rendering the `open`
  // attribute gives a non-modal dialog with no backdrop, no focus trap and no
  // inert background.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // `cancel` is the only cancelable hook for Esc; `close` fires after the
      // fact and can't be vetoed. The guard therefore has to live here.
      onCancel={(event) => {
        if (canClose && !canClose()) {
          event.preventDefault();
        }
      }}
      // The backdrop is not a separate node — clicking it reports the <dialog>
      // itself as the target, while clicks on the content report a descendant.
      onClick={(event) => {
        if (event.target !== dialogRef.current) return;
        if (canClose && !canClose()) return;
        onClose();
      }}
      // Keeps React in step with dismissals the browser performs on its own.
      // May fire again from the effect's own close() call, so onClose must be
      // safe to run when the dialog is already considered shut.
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-0 backdrop:bg-black/50 sm:w-auto sm:min-w-lg"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
