"use client";

import { Modal } from "@/app/_components/modal";
import { Button } from "@/app/_components/button";
import type { ButtonVariant } from "@/app/_components/design-system.types";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "decline",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      sizeClassName="w-fit max-w-[90vw]"
    >
      <p className="text-center text-sm text-ink-soft">{message}</p>
      <div className="flex justify-center gap-2">
        <Button type="button" variant={confirmVariant} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  );
}
