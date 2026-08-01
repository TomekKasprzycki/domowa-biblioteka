"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { findBookById } from "@/server/book/book.repository";
import { isConfirmedFriend } from "@/server/friend-connection/friend-connection.repository";
import {
  createLoanRequest,
  findActiveLoanForBook,
  findExistingRequest,
  approveLoan,
  declineLoan,
} from "@/server/loan/loan.repository";
import { isDuplicateError } from "@/lib/db-error.utils";

const bookIdSchema = z.uuid();
const loanIdSchema = z.uuid();

const SIGN_IN_TO_BORROW_MESSAGE = "You must be signed in to request a book.";
const SIGN_IN_TO_RESPOND_MESSAGE =
  "You must be signed in to respond to a borrow request.";
const BOOK_NOT_FOUND_MESSAGE = "This book no longer exists.";
const OWN_BOOK_MESSAGE = "You can't borrow your own book.";
const NOT_FRIEND_MESSAGE = "You can only borrow books from confirmed friends.";
const ALREADY_BORROWED_MESSAGE = "This book is already on loan.";
const DUPLICATE_REQUEST_MESSAGE = "You've already requested this book.";
const LOAN_NOT_FOUND_MESSAGE =
  "Request not found or you don't have permission to do that.";

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
  if (await findActiveLoanForBook(bookId)) {
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
