"use server";

import { z } from "zod";
import { auth, signOut } from "@/auth";
import { deleteAccount } from "@/server/account-deletion/account-deletion.repository";

const confirmEmailSchema = z
  .string()
  .trim()
  .min(1, "Type your email to confirm.");

const AUTH_MESSAGE = "You must be signed in to delete your account.";
const MISMATCH_MESSAGE =
  "The email you typed doesn't match your account email.";
const BLOCKED_MESSAGE =
  "You have an active loan, or one of your books is on loan to someone else. Resolve it before deleting your account.";
const CONFLICT_MESSAGE = "Something changed. Please try again.";

export async function deleteAccountAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return AUTH_MESSAGE;
  }

  const parsedConfirmEmail = confirmEmailSchema.safeParse(
    formData.get("confirmEmail")
  );
  if (!parsedConfirmEmail.success) {
    return MISMATCH_MESSAGE;
  }

  // session.user.email is string | null | undefined — a bare === against a
  // possibly-null value would let an empty/absent field match. Guard it
  // explicitly rather than comparing raw values.
  const sessionEmail = session.user.email;
  if (!sessionEmail || parsedConfirmEmail.data !== sessionEmail.trim()) {
    return MISMATCH_MESSAGE;
  }

  const result = await deleteAccount(session.user.id);

  if (result === "blocked") {
    return BLOCKED_MESSAGE;
  }
  if (result === "conflict") {
    return CONFLICT_MESSAGE;
  }

  await signOut({ redirectTo: "/?accountDeleted=1" });
  return null;
}
