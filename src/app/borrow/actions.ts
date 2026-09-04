"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { findBookById } from "@/server/book/book.repository";
import { isConfirmedFriend } from "@/server/friend-connection/friend-connection.repository";
import {
  createLoanRequest,
  findOpenLoanForBook,
  findExistingRequest,
  approveLoan,
  declineLoan,
  markReturned,
  confirmReturn,
} from "@/server/loan/loan.repository";
import { isDuplicateError } from "@/lib/db-error.utils";

const bookIdSchema = z.uuid();
const loanIdSchema = z.uuid();

const SIGN_IN_TO_BORROW_MESSAGE =
  "Musisz być zalogowany, aby poprosić o wypożyczenie książki.";
const SIGN_IN_TO_RESPOND_MESSAGE =
  "Musisz być zalogowany, aby odpowiedzieć na prośbę o wypożyczenie.";
const BOOK_NOT_FOUND_MESSAGE = "Ta książka już nie istnieje.";
const OWN_BOOK_MESSAGE = "Nie możesz wypożyczyć własnej książki.";
const NOT_FRIEND_MESSAGE =
  "Możesz wypożyczać książki tylko od potwierdzonych znajomych.";
const ALREADY_BORROWED_MESSAGE = "Ta książka jest już wypożyczona.";
const DUPLICATE_REQUEST_MESSAGE = "Masz już wysłaną prośbę o tę książkę.";
const LOAN_NOT_FOUND_MESSAGE =
  "Nie znaleziono prośby lub nie masz uprawnień, aby to zrobić.";
const SIGN_IN_TO_RETURN_MESSAGE =
  "Musisz być zalogowany, aby oznaczyć książkę jako zwróconą.";
const SIGN_IN_TO_CONFIRM_MESSAGE =
  "Musisz być zalogowany, aby potwierdzić zwrot.";
// Deliberately vague, like LOAN_NOT_FOUND_MESSAGE: a failed transition may mean
// the loan is missing, belongs to someone else, or has already moved on. Naming
// which would leak the existence of other people's loans.
const RETURN_NOT_POSSIBLE_MESSAGE =
  "Nie można oznaczyć tego wypożyczenia jako zwróconego — być może już zostało oznaczone.";
const CONFIRM_NOT_POSSIBLE_MESSAGE =
  "Nie można potwierdzić tego zwrotu — być może już został potwierdzony.";

// Closing or reopening a loan changes what four separate pages render: the
// borrower's list, the owner's inbox, the owner's collection (loan state), and
// every friend's discover view (availability). Server Actions don't invalidate
// the client Router Cache on their own, so each must be named explicitly.
function revalidateLoanSurfaces(): void {
  revalidatePath("/borrowing");
  revalidatePath("/requests");
  revalidatePath("/collection");
  revalidatePath("/discover");
}

export async function requestBorrowAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return SIGN_IN_TO_BORROW_MESSAGE;
  }

  const parsedBookId = bookIdSchema.safeParse(formData.get("bookId"));
  if (!parsedBookId.success) {
    return BOOK_NOT_FOUND_MESSAGE;
  }
  const bookId = parsedBookId.data;

  const book = await findBookById(bookId);
  if (!book) {
    return BOOK_NOT_FOUND_MESSAGE;
  }
  if (book.userId === session.user.id) {
    return OWN_BOOK_MESSAGE;
  }
  if (!(await isConfirmedFriend(session.user.id, book.userId))) {
    return NOT_FRIEND_MESSAGE;
  }
  if (await findOpenLoanForBook(bookId)) {
    return ALREADY_BORROWED_MESSAGE;
  }
  if (await findExistingRequest(bookId, session.user.id)) {
    return DUPLICATE_REQUEST_MESSAGE;
  }

  try {
    await createLoanRequest({
      bookId,
      requesterId: session.user.id,
      ownerId: book.userId,
    });
  } catch (error) {
    if (isDuplicateError(error)) {
      return DUPLICATE_REQUEST_MESSAGE;
    }
    throw error;
  }

  revalidatePath("/discover");
  revalidatePath("/borrowing");
  return null;
}

export async function approveRequestAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return SIGN_IN_TO_RESPOND_MESSAGE;
  }

  const parsedLoanId = loanIdSchema.safeParse(formData.get("loanId"));
  if (!parsedLoanId.success) {
    return LOAN_NOT_FOUND_MESSAGE;
  }

  const result = await approveLoan(parsedLoanId.data, session.user.id);
  if (result === "not-found") {
    return LOAN_NOT_FOUND_MESSAGE;
  }
  if (result === "already-borrowed") {
    return ALREADY_BORROWED_MESSAGE;
  }

  revalidatePath("/requests");
  revalidatePath("/discover");
  revalidatePath("/borrowing");
  return null;
}

export async function declineRequestAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return SIGN_IN_TO_RESPOND_MESSAGE;
  }

  const parsedLoanId = loanIdSchema.safeParse(formData.get("loanId"));
  if (!parsedLoanId.success) {
    return LOAN_NOT_FOUND_MESSAGE;
  }

  const declined = await declineLoan(parsedLoanId.data, session.user.id);
  if (!declined) {
    return LOAN_NOT_FOUND_MESSAGE;
  }

  revalidatePath("/requests");
  revalidatePath("/discover");
  revalidatePath("/borrowing");
  return null;
}

// The two halves of the return handshake. Neither pre-checks ownership: the
// repository's conditional UPDATE matches on the acting user and the expected
// status in one statement, so a wrong actor, a wrong state and a missing row
// all arrive here as the same `false`.
export async function markReturnedAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return SIGN_IN_TO_RETURN_MESSAGE;
  }

  const parsedLoanId = loanIdSchema.safeParse(formData.get("loanId"));
  if (!parsedLoanId.success) {
    return RETURN_NOT_POSSIBLE_MESSAGE;
  }

  const marked = await markReturned(parsedLoanId.data, session.user.id);
  if (!marked) {
    return RETURN_NOT_POSSIBLE_MESSAGE;
  }

  revalidateLoanSurfaces();
  return null;
}

export async function confirmReturnAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  if (!session?.user) {
    return SIGN_IN_TO_CONFIRM_MESSAGE;
  }

  const parsedLoanId = loanIdSchema.safeParse(formData.get("loanId"));
  if (!parsedLoanId.success) {
    return CONFIRM_NOT_POSSIBLE_MESSAGE;
  }

  const confirmed = await confirmReturn(parsedLoanId.data, session.user.id);
  if (!confirmed) {
    return CONFIRM_NOT_POSSIBLE_MESSAGE;
  }

  revalidateLoanSurfaces();
  return null;
}
