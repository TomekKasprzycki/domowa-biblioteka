"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { findByEmail } from "@/server/user/user.repository";
import {
  sendInvite,
  findConnectionBetween,
  updateStatus,
  deleteConnection,
} from "@/server/friend-connection/friend-connection.repository";
import { FriendConnectionStatus } from "@/server/friend-connection/friend-connection.types";
import { isDuplicateError } from "@/lib/db-error.utils";

const emailSchema = z
  .string()
  .trim()
  .pipe(z.email("Podaj prawidłowy adres e-mail."));
const connectionIdSchema = z.uuid();

const NOT_FOUND_MESSAGE =
  "Nie znaleziono połączenia lub nie masz uprawnień, aby to zrobić.";
const UNKNOWN_EMAIL_MESSAGE = "Nie znaleziono użytkownika o tym adresie e-mail.";
const SELF_INVITE_MESSAGE = "Nie możesz zaprosić samego siebie.";
const DUPLICATE_MESSAGE = "Masz już wysłane zaproszenie do tego użytkownika.";
const ALREADY_FRIENDS_MESSAGE = "Jesteście już znajomymi.";

export async function sendInviteAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return "Musisz być zalogowany, aby wysłać zaproszenie do znajomych.";
  }

  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) {
    return parsedEmail.error.issues[0]?.message ?? "Nieprawidłowy adres e-mail.";
  }

  const targetUser = await findByEmail(parsedEmail.data);
  if (!targetUser) {
    return UNKNOWN_EMAIL_MESSAGE;
  }
  if (targetUser.id === session.user.id) {
    return SELF_INVITE_MESSAGE;
  }

  let result;
  try {
    result = await sendInvite(session.user.id, targetUser.id);
  } catch (error) {
    if (isDuplicateError(error)) {
      // The other party inserted concurrently between our findConnectionBetween
      // check and our write (the canonical-pair index closing that race) —
      // re-read to report the accurate current state rather than a generic
      // duplicate message.
      const existing = await findConnectionBetween(
        session.user.id,
        targetUser.id
      );
      if (existing?.status === FriendConnectionStatus.ACCEPTED) {
        return ALREADY_FRIENDS_MESSAGE;
      }
      return DUPLICATE_MESSAGE;
    }
    throw error;
  }

  if (result === "duplicate") {
    return DUPLICATE_MESSAGE;
  }
  if (result === "already-friends") {
    return ALREADY_FRIENDS_MESSAGE;
  }

  revalidatePath("/friends");
  return null;
}

export async function acceptInviteAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return "Musisz być zalogowany, aby odpowiedzieć na zaproszenie do znajomych.";
  }

  const parsedId = connectionIdSchema.safeParse(formData.get("connectionId"));
  if (!parsedId.success) {
    return NOT_FOUND_MESSAGE;
  }

  const updated = await updateStatus(
    parsedId.data,
    session.user.id,
    FriendConnectionStatus.ACCEPTED
  );
  if (!updated) {
    return NOT_FOUND_MESSAGE;
  }

  revalidatePath("/friends");
  return null;
}

export async function rejectInviteAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return "Musisz być zalogowany, aby odpowiedzieć na zaproszenie do znajomych.";
  }

  const parsedId = connectionIdSchema.safeParse(formData.get("connectionId"));
  if (!parsedId.success) {
    return NOT_FOUND_MESSAGE;
  }

  const updated = await updateStatus(
    parsedId.data,
    session.user.id,
    FriendConnectionStatus.REJECTED
  );
  if (!updated) {
    return NOT_FOUND_MESSAGE;
  }

  revalidatePath("/friends");
  return null;
}

export async function removeFriendAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return "Musisz być zalogowany, aby usunąć znajomego.";
  }

  const parsedId = connectionIdSchema.safeParse(formData.get("connectionId"));
  if (!parsedId.success) {
    return NOT_FOUND_MESSAGE;
  }

  const removed = await deleteConnection(parsedId.data, session.user.id);
  if (!removed) {
    return NOT_FOUND_MESSAGE;
  }

  revalidatePath("/friends");
  return null;
}
