"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { QueryFailedError } from "typeorm";
import { createUser } from "@/server/user/user.repository";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
    return parsed.error.issues[0]?.message ?? "Invalid input.";
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
      return "An account with this email already exists.";
    }
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Account created, but sign-in failed. Please sign in manually.";
    }
    throw error;
  }

  return null;
}
