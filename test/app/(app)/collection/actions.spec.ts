import { DataSource } from "typeorm";
import {
  addBookAction,
  updateBookAction,
  deleteBookAction,
} from "@/app/(app)/collection/actions";
import { createBook, findByUserId } from "@/server/book/book.repository";
import {
  createLoanRequest,
  approveLoan,
} from "@/server/loan/loan.repository";
import { LoanEntity } from "@/server/loan/loan.entity";
import { BookEntity } from "@/server/book/book.entity";
import { createUser } from "@/server/user/user.repository";
import { UserEntity } from "@/server/user/user.entity";
import { getDataSource } from "@/lib/data-source";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
import { auth } from "@/auth";

// revalidatePath needs Next's request-scoped context, which doesn't exist
// when invoking a Server Action directly outside a real request/render.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const mockAuth = auth as jest.Mock;

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("collection actions", () => {
  const suffix = Date.now();
  const ownerEmail = `action-owner-${suffix}@example.com`;
  const otherEmail = `action-other-${suffix}@example.com`;
  const title = `Action Book ${suffix}`;
  const author = "Action Author";

  let ds: DataSource;
  let ownerId: string;
  let otherId: string;

  beforeAll(async () => {
    ds = await getDataSource();
    const owner = await createUser({
      email: ownerEmail,
      passwordHash: "hashed_password_value",
      name: "Action Owner",
    });
    const other = await createUser({
      email: otherEmail,
      passwordHash: "hashed_password_value",
      name: "Action Other",
    });
    ownerId = owner.id;
    otherId = other.id;
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      // Loans first: the books FK is ON DELETE NO ACTION, so a book with any
      // loan row cannot be removed — the very rule these tests exercise.
      await ds.getRepository(LoanEntity).delete({ ownerId });
      await ds.getRepository(BookEntity).delete({ userId: ownerId });
      await ds.getRepository(UserEntity).delete({ email: ownerEmail });
      await ds.getRepository(UserEntity).delete({ email: otherEmail });
      await ds.destroy();
    }
  });

  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("adds a book for the signed-in user", async () => {
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    const result = await addBookAction(
      null,
      formData({ title, author, notes: "" })
    );

    expect(result).toBeNull();
    const books = await findByUserId(ownerId);
    expect(books.some((b) => b.title === title && b.author === author)).toBe(
      true
    );
  });

  it("rejects a blank title without touching the DB", async () => {
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    const before = await findByUserId(ownerId);
    const result = await addBookAction(
      null,
      formData({ title: "  ", author, notes: "" })
    );

    expect(result).toBe("Title is required");
    const after = await findByUserId(ownerId);
    expect(after.length).toBe(before.length);
  });

  it("rejects an exact duplicate title+author for the same user", async () => {
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    const result = await addBookAction(
      null,
      formData({ title, author, notes: "" })
    );

    expect(result).toBe(
      "You already have a book with this title and author."
    );
  });

  it("clears notes on update when the field is submitted empty", async () => {
    mockAuth.mockResolvedValue({ user: { id: ownerId } });
    const [book] = await findByUserId(ownerId);

    const withNotes = await updateBookAction(
      null,
      formData({ bookId: book.id, title, author, notes: "some notes" })
    );
    expect(withNotes).toBeNull();

    const cleared = await updateBookAction(
      null,
      formData({ bookId: book.id, title, author, notes: "" })
    );
    expect(cleared).toBeNull();

    const [updated] = await findByUserId(ownerId);
    expect(updated.notes).toBeNull();
  });

  it("returns not-found/not-owned when a different user updates the book", async () => {
    mockAuth.mockResolvedValue({ user: { id: otherId } });
    const [book] = await findByUserId(ownerId);

    const result = await updateBookAction(
      null,
      formData({ bookId: book.id, title, author, notes: "hijacked" })
    );

    expect(result).toBe(
      "Book not found or you don't have permission to edit it."
    );
  });

  it("returns not-found/not-owned for a malformed bookId", async () => {
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    const result = await updateBookAction(
      null,
      formData({ bookId: "not-a-uuid", title, author, notes: "" })
    );

    expect(result).toBe(
      "Book not found or you don't have permission to edit it."
    );
  });

  it("returns not-found/not-owned when a different user deletes the book", async () => {
    mockAuth.mockResolvedValue({ user: { id: otherId } });
    const [book] = await findByUserId(ownerId);

    const result = await deleteBookAction(null, formData({ bookId: book.id }));

    expect(result).toBe(
      "Book not found or you don't have permission to edit it."
    );
  });

  it("deletes the book for its owner", async () => {
    mockAuth.mockResolvedValue({ user: { id: ownerId } });
    const [book] = await findByUserId(ownerId);

    const result = await deleteBookAction(null, formData({ bookId: book.id }));

    expect(result).toBeNull();
    const remaining = await findByUserId(ownerId);
    expect(remaining.some((b) => b.id === book.id)).toBe(false);
  });

  it("refuses to delete a book that is currently on loan", async () => {
    // given
    const book = await createBook({
      userId: ownerId,
      title: `On Loan ${suffix}`,
      author,
    });
    const loan = await createLoanRequest({
      bookId: book.id,
      requesterId: otherId,
      ownerId,
    });
    await approveLoan(loan.id, ownerId);
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    // when
    const result = await deleteBookAction(null, formData({ bookId: book.id }));

    // then
    expect(result).toBe("This book is currently on loan and can't be deleted.");
    expect((await findByUserId(ownerId)).some((b) => b.id === book.id)).toBe(
      true
    );
  });

  it("refuses to delete a book whose only loans are closed", async () => {
    // given
    const book = await createBook({
      userId: ownerId,
      title: `Closed Loan ${suffix}`,
      author,
    });
    const loan = await createLoanRequest({
      bookId: book.id,
      requesterId: otherId,
      ownerId,
    });
    // declined is terminal, so the book is free — but the FK still refuses
    await ds
      .getRepository(LoanEntity)
      .update({ id: loan.id }, { status: "declined" });
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    // when
    const result = await deleteBookAction(null, formData({ bookId: book.id }));

    // then
    expect(result).toBe(
      "This book has borrow requests or borrowing history and can't be deleted."
    );
    expect((await findByUserId(ownerId)).some((b) => b.id === book.id)).toBe(
      true
    );
  });

  it("tells a non-owner only not-found, even when the book is on loan", async () => {
    // given
    // the on-loan book from the previous test belongs to ownerId
    const [onLoanBook] = (await findByUserId(ownerId)).filter(
      (b) => b.title === `On Loan ${suffix}`
    );
    mockAuth.mockResolvedValue({ user: { id: otherId } });

    // when
    const result = await deleteBookAction(
      null,
      formData({ bookId: onLoanBook.id })
    );

    // then
    // the loan-state messages must not leak to someone who doesn't own it
    expect(result).toBe(
      "Book not found or you don't have permission to edit it."
    );
  });

  it("deletes a book that has never been borrowed", async () => {
    // given
    const book = await createBook({
      userId: ownerId,
      title: `Never Borrowed ${suffix}`,
      author,
    });
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    // when
    const result = await deleteBookAction(null, formData({ bookId: book.id }));

    // then
    expect(result).toBeNull();
    expect((await findByUserId(ownerId)).some((b) => b.id === book.id)).toBe(
      false
    );
  });

  it("stores a normalized ISBN when a valid one is submitted", async () => {
    // given a signed-in user and a valid ISBN
    mockAuth.mockResolvedValue({ user: { id: ownerId } });
    const isbnTitle = `ISBN Action Book ${suffix}`;

    // when adding a book with that ISBN
    const result = await addBookAction(
      null,
      formData({
        title: isbnTitle,
        author,
        notes: "",
        isbn: "978-0-14-032872-1",
      })
    );

    // then it succeeds and the normalized ISBN reaches the row
    expect(result).toBeNull();
    const books = await findByUserId(ownerId);
    const created = books.find((b) => b.title === isbnTitle);
    expect(created?.isbn).toBe("9780140328721");
  });

  it("rejects an ISBN with a broken check digit without touching the DB", async () => {
    // given a signed-in user and an ISBN with a broken check digit
    mockAuth.mockResolvedValue({ user: { id: ownerId } });
    const invalidTitle = `Invalid ISBN Book ${suffix}`;

    // when adding a book with that ISBN
    const before = await findByUserId(ownerId);
    const result = await addBookAction(
      null,
      formData({
        title: invalidTitle,
        author,
        notes: "",
        isbn: "9780140328722",
      })
    );

    // then it is rejected and nothing is written
    expect(result).toBe("That ISBN doesn't look right.");
    const after = await findByUserId(ownerId);
    expect(after.length).toBe(before.length);
  });
});
