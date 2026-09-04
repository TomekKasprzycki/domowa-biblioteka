"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { findByEmail } from "@/server/user/user.repository";
import { createPasswordResetToken } from "@/server/password-reset/password-reset.repository";
import { sendPasswordResetEmail } from "@/server/password-reset/send-reset-email";
import { getBaseUrl } from "@/lib/get-base-url.utils";

const requestResetSchema = z.object({
  email: z.string().email("Nieprawidłowy adres e-mail"),
});

export async function requestPasswordResetAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const parsed = requestResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Nieprawidłowe dane.";
  }

  const user = await findByEmail(parsed.data.email);

  if (user) {
    try {
      const rawToken = await createPasswordResetToken(user.id);
      const resetUrl = `${getBaseUrl()}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      console.error("password reset email send failed", error);
    }
  }

  redirect("/forgot-password?sent=1");
}
