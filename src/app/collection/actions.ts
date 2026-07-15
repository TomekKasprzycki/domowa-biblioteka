"use server";

import { revalidatePath } from "next/cache";
import { QueryFailedError } from "typeorm";
import { z } from "zod";
import { auth } from "@/auth";
import {
  createBook,
  updateBook,
  deleteBook,
} from "@/server/book/book.repository";

const titleSchema = z.string().trim().min(1, "Title is required").max(255);
const authorSchema = z.string().trim().min(1, "Author is required").max(255);
const notesSchema = z.string().trim().max(2000, "Notes are too long");
const bookIdSchema = z.uuid();

const NOT_FOUND_MESSAGE =
  "Book not found or you don't have permission to edit it.";
const DUPLICATE_MESSAGE =
  "You already have a book with this title and author.";

function isDuplicateError(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as { code?: string }).code === "23505"
  );
}

export async function addBookAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return "You must be signed in to add a book.";
  }

  const parsedTitle = titleSchema.safeParse(formData.get("title"));
  if (!parsedTitle.success) {
    return parsedTitle.error.issues[0]?.message ?? "Invalid title.";
  }
  const parsedAuthor = authorSchema.safeParse(formData.get("author"));
  if (!parsedAuthor.success) {
    return parsedAuthor.error.issues[0]?.message ?? "Invalid author.";
  }
  const rawNotes = formData.get("notes");
  const parsedNotes = notesSchema.safeParse(
    typeof rawNotes === "string" ? rawNotes : ""
  );
  if (!parsedNotes.success) {
    return parsedNotes.error.issues[0]?.message ?? "Invalid notes.";
  }
  // Add is a fresh row: an empty notes field just means "don't set notes".
  const notes = parsedNotes.data === "" ? undefined : parsedNotes.data;

  try {
    await createBook({
      userId: session.user.id,
      title: parsedTitle.data,
      author: parsedAuthor.data,
      notes,
    });
  } catch (error) {
    if (isDuplicateError(error)) {
      return DUPLICATE_MESSAGE;
    }
    throw error;
  }

  // Server Actions don't auto-invalidate the client Router Cache: without
  // this, /collection keeps rendering the pre-mutation RSC payload until a
  // hard refresh.
  revalidatePath("/collection");
  return null;
}

export async function updateBookAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return "You must be signed in to edit a book.";
  }

  const parsedBookId = bookIdSchema.safeParse(formData.get("bookId"));
  if (!parsedBookId.success) {
    return NOT_FOUND_MESSAGE;
  }
  const parsedTitle = titleSchema.safeParse(formData.get("title"));
  if (!parsedTitle.success) {
    return parsedTitle.error.issues[0]?.message ?? "Invalid title.";
  }
  const parsedAuthor = authorSchema.safeParse(formData.get("author"));
  if (!parsedAuthor.success) {
    return parsedAuthor.error.issues[0]?.message ?? "Invalid author.";
  }
  const rawNotes = formData.get("notes");
  const parsedNotes = notesSchema.safeParse(
    typeof rawNotes === "string" ? rawNotes : ""
  );
  if (!parsedNotes.success) {
    return parsedNotes.error.issues[0]?.message ?? "Invalid notes.";
  }
  // Edit resubmits the full form: an empty notes field unambiguously means
  // the user cleared it, so it must reach the repository as null, not be
  // omitted (omitting it would leave the previous notes value untouched).
  const notes = parsedNotes.data === "" ? null : parsedNotes.data;

  try {
    const updated = await updateBook(parsedBookId.data, session.user.id, {
      title: parsedTitle.data,
      author: parsedAuthor.data,
      notes,
    });
    if (!updated) {
      return NOT_FOUND_MESSAGE;
    }
  } catch (error) {
    if (isDuplicateError(error)) {
      return DUPLICATE_MESSAGE;
    }
    throw error;
  }

  revalidatePath("/collection");
  return null;
}

export async function deleteBookAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return "You must be signed in to delete a book.";
  }

  const parsedBookId = bookIdSchema.safeParse(formData.get("bookId"));
  if (!parsedBookId.success) {
    return NOT_FOUND_MESSAGE;
  }

  const deleted = await deleteBook(parsedBookId.data, session.user.id);
  if (!deleted) {
    return NOT_FOUND_MESSAGE;
  }

  revalidatePath("/collection");
  return null;
}
