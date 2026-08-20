"use client";

import { useActionState } from "react";
import { registerAction } from "../actions";
import { Field } from "@/app/_components/field";
import { Button } from "@/app/_components/button";

export function RegisterForm() {
  const [error, formAction, isPending] = useActionState(registerAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-1 w-full max-w-sm">
      <Field id="name" label="Name" type="text" name="name" required autoComplete="name" />

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
        minLength={8}
        autoComplete="new-password"
      />

      {error && (
        <p role="alert" className="mb-3.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={isPending} className="w-full">
        {isPending ? "Creating account…" : "Create account"}
      </Button>

      <p className="mt-4 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-green-700 underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
