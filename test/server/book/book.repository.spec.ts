import { DataSource } from "typeorm";
import {
  createBook,
  findByUserId,
  findByOwnerIds,
  updateBook,
  deleteBook,
} from "@/server/book/book.repository";
import { BookEntity } from "@/server/book/book.entity";
import { createUser } from "@/server/user/user.repository";
import { UserEntity } from "@/server/user/user.entity";
import { getDataSource } from "@/lib/data-source";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("bookRepository", () => {
  const suffix = Date.now();
  const ownerEmail = `book-owner-${suffix}@example.com`;
  const otherEmail = `book-other-${suffix}@example.com`;
  const excludedEmail = `book-excluded-${suffix}@example.com`;
  const title = `Test Book ${suffix}`;
  const author = "Test Author";

  let ds: DataSource;
  let ownerId: string;
  let otherId: string;
  let excludedId: string;
  let bookId: string;

  beforeAll(async () => {
    ds = await getDataSource();
    const owner = await createUser({
      email: ownerEmail,
      passwordHash: "hashed_password_value",
      name: "Book Owner",
    });
    const other = await createUser({
      email: otherEmail,
      passwordHash: "hashed_password_value",
      name: "Other User",
    });
    const excluded = await createUser({
      email: excludedEmail,
      passwordHash: "hashed_password_value",
      name: "Excluded User",
    });
    ownerId = owner.id;
    otherId = other.id;
    excludedId = excluded.id;
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      await ds.getRepository(BookEntity).delete({ userId: ownerId });
      await ds.getRepository(BookEntity).delete({ userId: otherId });
      await ds.getRepository(BookEntity).delete({ userId: excludedId });
      await ds.getRepository(UserEntity).delete({ email: ownerEmail });
      await ds.getRepository(UserEntity).delete({ email: otherEmail });
      await ds.getRepository(UserEntity).delete({ email: excludedEmail });
      await ds.destroy();
    }
  });

  it("creates a book with an application-generated id", async () => {
    const book = await createBook({ userId: ownerId, title, author });
    expect(book.id).toMatch(UUID_REGEX);
    expect(book.title).toBe(title);
    bookId = book.id;
  });

  it("finds books by userId", async () => {
    const books = await findByUserId(ownerId);
    expect(books.some((b) => b.id === bookId)).toBe(true);
  });

  it("returns [] for an empty ownerIds array without querying", async () => {
    // given
    // no owners are supplied

    // when
    const books = await findByOwnerIds([]);

    // then
    expect(books).toEqual([]);
  });

  it("returns books across multiple owners with the owner relation populated", async () => {
    // given
    await createBook({
      userId: otherId,
      title: `Other Book ${suffix}`,
      author,
    });

    // when
    const books = await findByOwnerIds([ownerId, otherId]);

    // then
    const ownerBook = books.find((b) => b.userId === ownerId);
    const otherBook = books.find((b) => b.userId === otherId);
    expect(ownerBook).toBeDefined();
    expect(otherBook).toBeDefined();
    expect(ownerBook?.owner.email).toBe(ownerEmail);
    expect(otherBook?.owner.email).toBe(otherEmail);
  });

  it("excludes books owned by users outside the given list", async () => {
    // given
    await createBook({
      userId: excludedId,
      title: `Excluded Book ${suffix}`,
      author,
    });

    // when
    const books = await findByOwnerIds([ownerId, otherId]);

    // then
    expect(books.some((b) => b.userId === excludedId)).toBe(false);
  });

  it("rejects a duplicate title+author for the same user", async () => {
    await expect(
      createBook({ userId: ownerId, title, author })
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("updates a book for its owner", async () => {
    const updated = await updateBook(bookId, ownerId, { notes: "updated" });
    expect(updated?.notes).toBe("updated");
  });

  it("returns null updating a book owned by a different user", async () => {
    const result = await updateBook(bookId, otherId, { notes: "hijacked" });
    expect(result).toBeNull();
  });

  it("returns false deleting a book owned by a different user", async () => {
    const result = await deleteBook(bookId, otherId);
    expect(result).toBe(false);
  });

  it("deletes a book for its owner", async () => {
    const result = await deleteBook(bookId, ownerId);
    expect(result).toBe(true);
  });
});
