"use client";

import { useActionState } from "react";
import { sendInviteAction } from "@/app/(app)/friends/actions";
import { Field } from "@/app/_components/field";
import { Button } from "@/app/_components/button";

export function SendInviteForm() {
  const [error, formAction, isPending] = useActionState(
    sendInviteAction,
    null
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-1 rounded-card border border-line bg-paper-card p-4 shadow-card"
    >
      <Field label="E-mail znajomego" id="email" type="email" name="email" required />

      {error && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" className="self-start" disabled={isPending}>
        {isPending ? "Wysyłanie…" : "Wyślij zaproszenie"}
      </Button>
    </form>
  );
}
