"use client";

import { useActionState } from "react";
import { sendInviteAction } from "@/app/friends/actions";

export function SendInviteForm() {
  const [error, formAction, isPending] = useActionState(
    sendInviteAction,
    null
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Friend&apos;s email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
