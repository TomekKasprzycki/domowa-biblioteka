"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { Field } from "@/app/_components/field";
import { Button } from "@/app/_components/button";

interface LoginFormProps {
  callbackUrl: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [error, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-1 w-full max-w-sm">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <Field
        id="email"
        label="E-mail"
        type="email"
        name="email"
        required
        autoComplete="email"
      />

      <Field
        id="password"
        label="Hasło"
        type="password"
        name="password"
        required
        autoComplete="current-password"
      />

      <a
        href="/forgot-password"
        className="mb-3.5 -mt-2 text-right text-xs font-medium text-green-700 underline"
      >
        Nie pamiętasz hasła?
      </a>

      {error && (
        <p role="alert" className="mb-3.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={isPending} className="w-full">
        {isPending ? "Logowanie…" : "Zaloguj się"}
      </Button>

      <p className="mt-4 text-center text-sm text-ink-soft">
        Nie masz konta?{" "}
        <a href="/register" className="font-medium text-green-700 underline">
          Zarejestruj się
        </a>
      </p>
    </form>
  );
}
