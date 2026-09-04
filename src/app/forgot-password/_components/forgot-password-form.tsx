"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "../actions";
import { Field } from "@/app/_components/field";
import { Button } from "@/app/_components/button";

export function ForgotPasswordForm() {
  const [error, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-1 w-full max-w-sm">
      <Field
        id="email"
        label="Email"
        type="email"
        name="email"
        required
        autoComplete="email"
      />

      {error && (
        <p role="alert" className="mb-3.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={isPending}
        className="w-full"
      >
        {isPending ? "Wysyłanie…" : "Wyślij link resetujący"}
      </Button>

      <p className="mt-4 text-center text-sm text-ink-soft">
        Przypomniałeś sobie hasło?{" "}
        <a href="/login" className="font-medium text-green-700 underline">
          Zaloguj się
        </a>
      </p>
    </form>
  );
}
