import { DataSource } from "typeorm";
import {
  addBookAction,
  updateBookAction,
  deleteBookAction,
} from "@/app/collection/actions";
import { findByUserId } from "@/server/book/book.repository";
import { BookEntity } from "@/server/book/book.entity";
import { createUser } from "@/server/user/user.repository";
import { UserEntity } from "@/server/user/user.entity";
import { getDataSource } from "@/lib/data-source";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
import { auth } from "@/auth";

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
});
