"use server";

import { z } from "zod";
import { auth, signOut } from "@/auth";
import { deleteAccount } from "@/server/account-deletion/account-deletion.repository";

const confirmEmailSchema = z
  .string()
  .trim()
  .min(1, "Wpisz swój adres e-mail, aby potwierdzić.");

const AUTH_MESSAGE = "Musisz być zalogowany, aby usunąć konto.";
const MISMATCH_MESSAGE =
  "Wpisany adres e-mail nie zgadza się z adresem Twojego konta.";
const BLOCKED_MESSAGE =
  "Masz aktywne wypożyczenie lub jedna z Twoich książek jest wypożyczona komuś innemu. Rozwiąż to przed usunięciem konta.";
const CONFLICT_MESSAGE = "Coś się zmieniło. Spróbuj ponownie.";

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
