"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function Drawer({
  open,
  onClose,
  spineColor,
  title,
  author,
  isbn,
  statusSlot,
  actionsSlot,
}: {
  open: boolean;
  onClose: () => void;
  spineColor: string;
  title: string;
  author: string;
  isbn: string | null;
  statusSlot?: ReactNode;
  actionsSlot?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Same imperative show/close pairing as Modal — duplicated rather than
  // shared, since Drawer's positioning is otherwise unrelated to Modal's
  // centered dialog (see plan.md Key Discoveries).
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
      // No onCancel handler: unlike Modal, Drawer has no dirty-form guard to
      // veto Escape with, so the browser's default cancel->close sequence is
      // left alone and onClose fires exactly once, from the `close` event
      // below (impl review F10b — this used to also wire onCancel={onClose},
      // firing onClose twice per Escape).
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== dialogRef.current) return;
        onClose();
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 w-[340px] max-w-[90vw] rounded-none border-0 bg-white p-0 shadow-panel transition-transform duration-200 ease-out starting:translate-x-full motion-reduce:transition-none backdrop:bg-[rgba(16,36,26,0.3)]"
    >
      <div className="flex h-full flex-col gap-4 px-6 py-[26px]">
        <button
          type="button"
          onClick={onClose}
          className="-m-2 self-end rounded-md px-2.5 py-2 text-[13px] text-ink-faint hover:bg-paper hover:text-ink"
        >
          Zamknij ✕
        </button>

        <div
          style={{ background: spineColor }}
          className="mx-auto h-[180px] w-14 rounded-t-[3px] shadow-[inset_-6px_0_10px_-6px_rgba(0,0,0,0.35)]"
        />

        <h2 id={titleId} className="text-center font-display text-lg">
          {title}
        </h2>
        <div className="text-center text-[13.5px] text-ink-soft">
          {author}
        </div>
        <div
          className={`text-center font-mono text-[11.5px] tracking-wide text-ink-faint ${isbn ? "" : "italic"}`}
        >
          {isbn ? `ISBN ${isbn}` : "Brak numeru ISBN — dodano ręcznie"}
        </div>

        {statusSlot && <div className="text-center">{statusSlot}</div>}
        {actionsSlot && (
          <div className="mt-1.5 flex flex-col gap-2">{actionsSlot}</div>
        )}
      </div>
    </dialog>
  );
}
