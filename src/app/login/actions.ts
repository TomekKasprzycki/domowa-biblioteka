"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  let callbackUrl = (formData.get("callbackUrl") as string) || "/";
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    callbackUrl = "/";
  }

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error;
  }

  return null;
}
