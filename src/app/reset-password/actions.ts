"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { resetPasswordWithToken } from "@/server/password-reset/password-reset.repository";

const INVALID_LINK_MESSAGE =
  "Ten link jest nieprawidłowy lub wygasł. Poproś o nowy.";

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, INVALID_LINK_MESSAGE),
    password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
    confirmPassword: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą się zgadzać.",
    path: ["confirmPassword"],
  });

export async function resetPasswordAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Nieprawidłowe dane.";
  }

  const { token, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await resetPasswordWithToken(token, passwordHash);

  if (result === "invalid") {
    return INVALID_LINK_MESSAGE;
  }

  redirect("/login?reset=1");
}
