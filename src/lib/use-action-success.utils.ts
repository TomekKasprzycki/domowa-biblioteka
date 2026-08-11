"use client";

import { useEffect, useRef } from "react";

/**
 * Fires `onSuccess` when a `useActionState` action completes without an error.
 *
 * `useActionState` has no built-in "on success" callback, so success is
 * detected by watching for the pending -> not-pending transition with no
 * error. The `wasPending` ref keeps this from firing on initial mount, where
 * `isPending` starts false too.
 */
export function useActionSuccess(
  isPending: boolean,
  error: string | null,
  onSuccess: () => void
): void {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      onSuccess();
    }
    // Updated after the check, never before: doing it first would make the
    // very first run look like a completed action.
    wasPending.current = isPending;
  }, [isPending, error, onSuccess]);
}
