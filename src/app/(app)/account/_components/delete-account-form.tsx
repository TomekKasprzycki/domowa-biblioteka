"use client";

import { useActionState, useState } from "react";
import { deleteAccountAction } from "@/app/(app)/account/actions";
import { Field } from "@/app/_components/field";
import { Button } from "@/app/_components/button";

export function DeleteAccountForm({ email }: { email: string }) {
  const [error, formAction, isPending] = useActionState(
    deleteAccountAction,
    null
  );
  const [typedEmail, setTypedEmail] = useState("");
  const matches = typedEmail.trim() === email;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field
        id="confirmEmail"
        label={`Wpisz ${email}, aby potwierdzić`}
        type="email"
        name="confirmEmail"
        value={typedEmail}
        onChange={(event) => setTypedEmail(event.target.value)}
        autoComplete="off"
        required
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="decline"
        disabled={!matches || isPending}
        className="w-full"
      >
        {isPending ? "Usuwanie…" : "Usuń moje konto"}
      </Button>
    </form>
  );
}
