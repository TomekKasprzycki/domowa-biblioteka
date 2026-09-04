"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { QueryFailedError } from "typeorm";
import { createUser } from "@/server/user/user.repository";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "Imię i nazwisko jest wymagane"),
  email: z.string().email("Nieprawidłowy adres e-mail"),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
});

export async function registerAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Nieprawidłowe dane.";
  }

  const { name, email, password } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await createUser({ email, passwordHash, name });
  } catch (error) {
    if (
      error instanceof QueryFailedError &&
      (error as { code?: string }).code === "23505"
    ) {
      return "Konto z tym adresem e-mail już istnieje.";
    }
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/collection" });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Konto zostało utworzone, ale logowanie się nie powiodło. Zaloguj się ręcznie.";
    }
    throw error;
  }

  return null;
}
