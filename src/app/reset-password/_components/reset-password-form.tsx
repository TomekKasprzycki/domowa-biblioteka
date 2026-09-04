"use client";

import { useActionState, useState } from "react";
import { resetPasswordAction } from "../actions";
import { Field } from "@/app/_components/field";
import { Button } from "@/app/_components/button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, formAction, isPending] = useActionState(
    resetPasswordAction,
    null
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const matches = password.length > 0 && password === confirmPassword;

  return (
    <form action={formAction} className="flex flex-col gap-1 w-full max-w-sm">
      <input type="hidden" name="token" value={token} />

      <Field
        id="password"
        label="Nowe hasło"
        type="password"
        name="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />

      <Field
        id="confirmPassword"
        label="Potwierdź nowe hasło"
        type="password"
        name="confirmPassword"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />

      {error && (
        <p role="alert" className="mb-3.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={!matches || isPending}
        className="w-full"
      >
        {isPending ? "Resetowanie…" : "Zresetuj hasło"}
      </Button>
    </form>
  );
}
