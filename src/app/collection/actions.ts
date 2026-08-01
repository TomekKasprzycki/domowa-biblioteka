"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import {
  createBook,
  updateBook,
  deleteBook,
  findBookById,
} from "@/server/book/book.repository";
import {
  countLoansForBook,
  findOpenLoanForBook,
} from "@/server/loan/loan.repository";
import {
  isDuplicateError,
  isForeignKeyViolation,
} from "@/lib/db-error.utils";

const titleSchema = z.string().trim().min(1, "Title is required").max(255);
const authorSchema = z.string().trim().min(1, "Author is required").max(255);
const notesSchema = z.string().trim().max(2000, "Notes are too long");
const bookIdSchema = z.uuid();

const NOT_FOUND_MESSAGE =
  "Book not found or you don't have permission to edit it.";
const DUPLICATE_MESSAGE =
  "You already have a book with this title and author.";
const ON_LOAN_MESSAGE =
  "This book is currently on loan and can't be deleted.";
// Covers every non-open loan row: pending requests, declines and closed loans
// alike. All of them are referenced by the FK, so none can be deleted.
const HAS_HISTORY_MESSAGE =
  "This book has borrow requests or borrowing history and can't be deleted.";

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

  const bookId = parsedBookId.data;

  // Ownership first. Every branch below reveals something about the book —
  // whether it exists, whether it is out, whether it has been borrowed — so a
  // non-owner has to be turned away before any of it runs. Otherwise the
  // messages become an oracle for books belonging to other people.
  const book = await findBookById(bookId);
  if (!book || book.userId !== session.user.id) {
    return NOT_FOUND_MESSAGE;
  }

  // The loans->books FK is ON DELETE NO ACTION, so Postgres refuses to delete a
  // book with ANY loan row, closed ones included. Pre-check to give a useful
  // message; catch 23503 as the backstop, since the pre-check is a
  // read-then-write and a loan can be created in between.
  if (await countLoansForBook(bookId)) {
    return (await findOpenLoanForBook(bookId))
      ? ON_LOAN_MESSAGE
      : HAS_HISTORY_MESSAGE;
  }

  try {
    const deleted = await deleteBook(bookId, session.user.id);
    if (!deleted) {
      return NOT_FOUND_MESSAGE;
    }
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return ON_LOAN_MESSAGE;
    }
    throw error;
  }

  revalidatePath("/collection");
  return null;
}
