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
        label="Email"
        type="email"
        name="email"
        required
        autoComplete="email"
      />

      <Field
        id="password"
        label="Password"
        type="password"
        name="password"
        required
        autoComplete="current-password"
      />

      {error && (
        <p role="alert" className="mb-3.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={isPending} className="w-full">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="mt-4 text-center text-sm text-ink-soft">
        No account?{" "}
        <a href="/register" className="font-medium text-green-700 underline">
          Register
        </a>
      </p>
    </form>
  );
}
