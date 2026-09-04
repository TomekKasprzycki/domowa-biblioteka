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
import { normalizeIsbn } from "@/lib/normalize-isbn.utils";

const titleSchema = z.string().trim().min(1, "Tytuł jest wymagany").max(255);
const authorSchema = z.string().trim().min(1, "Autor jest wymagany").max(255);
const notesSchema = z.string().trim().max(2000, "Notatki są za długie");
const bookIdSchema = z.uuid();

const NOT_FOUND_MESSAGE =
  "Nie znaleziono książki lub nie masz uprawnień, aby ją edytować.";
const DUPLICATE_MESSAGE =
  "Masz już książkę o tym tytule i autorze.";
const ON_LOAN_MESSAGE =
  "Ta książka jest obecnie wypożyczona i nie można jej usunąć.";
const INVALID_ISBN_MESSAGE = "Ten numer ISBN wygląda na nieprawidłowy.";
// Covers every non-open loan row: pending requests, declines and closed loans
// alike. All of them are referenced by the FK, so none can be deleted.
const HAS_HISTORY_MESSAGE =
  "Ta książka ma prośby o wypożyczenie lub historię wypożyczeń i nie można jej usunąć.";

export async function addBookAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return "Musisz być zalogowany, aby dodać książkę.";
  }

  const parsedTitle = titleSchema.safeParse(formData.get("title"));
  if (!parsedTitle.success) {
    return parsedTitle.error.issues[0]?.message ?? "Nieprawidłowy tytuł.";
  }
  const parsedAuthor = authorSchema.safeParse(formData.get("author"));
  if (!parsedAuthor.success) {
    return parsedAuthor.error.issues[0]?.message ?? "Nieprawidłowy autor.";
  }
  const rawNotes = formData.get("notes");
  const parsedNotes = notesSchema.safeParse(
    typeof rawNotes === "string" ? rawNotes : ""
  );
  if (!parsedNotes.success) {
    return parsedNotes.error.issues[0]?.message ?? "Nieprawidłowe notatki.";
  }
  // Add is a fresh row: an empty notes field just means "don't set notes".
  const notes = parsedNotes.data === "" ? undefined : parsedNotes.data;

  const rawIsbn = formData.get("isbn");
  const trimmedIsbn = typeof rawIsbn === "string" ? rawIsbn.trim() : "";
  let isbn: string | null = null;
  if (trimmedIsbn !== "") {
    const normalizedIsbn = normalizeIsbn(trimmedIsbn);
    if (!normalizedIsbn) {
      return INVALID_ISBN_MESSAGE;
    }
    isbn = normalizedIsbn;
  }

  try {
    await createBook({
      userId: session.user.id,
      title: parsedTitle.data,
      author: parsedAuthor.data,
      notes,
      isbn,
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
    return "Musisz być zalogowany, aby edytować książkę.";
  }

  const parsedBookId = bookIdSchema.safeParse(formData.get("bookId"));
  if (!parsedBookId.success) {
    return NOT_FOUND_MESSAGE;
  }
  const parsedTitle = titleSchema.safeParse(formData.get("title"));
  if (!parsedTitle.success) {
    return parsedTitle.error.issues[0]?.message ?? "Nieprawidłowy tytuł.";
  }
  const parsedAuthor = authorSchema.safeParse(formData.get("author"));
  if (!parsedAuthor.success) {
    return parsedAuthor.error.issues[0]?.message ?? "Nieprawidłowy autor.";
  }
  const rawNotes = formData.get("notes");
  const parsedNotes = notesSchema.safeParse(
    typeof rawNotes === "string" ? rawNotes : ""
  );
  if (!parsedNotes.success) {
    return parsedNotes.error.issues[0]?.message ?? "Nieprawidłowe notatki.";
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
    return "Musisz być zalogowany, aby usunąć książkę.";
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
