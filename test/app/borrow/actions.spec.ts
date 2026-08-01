import { DataSource } from "typeorm";
import {
  requestBorrowAction,
  approveRequestAction,
  declineRequestAction,
} from "@/app/borrow/actions";
import {
  findExistingRequest,
  findActiveLoanForBook,
} from "@/server/loan/loan.repository";
import { LoanEntity } from "@/server/loan/loan.entity";
import { LoanStatus } from "@/server/loan/loan.types";
import { createBook } from "@/server/book/book.repository";
import { BookEntity } from "@/server/book/book.entity";
import { sendInvite } from "@/server/friend-connection/friend-connection.repository";
import { FriendConnectionEntity } from "@/server/friend-connection/friend-connection.entity";
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

describe("borrow actions", () => {
  const suffix = Date.now();
  const ownerEmail = `borrow-owner-${suffix}@example.com`;
  const friendEmail = `borrow-friend-${suffix}@example.com`;
  const strangerEmail = `borrow-stranger-${suffix}@example.com`;

  let ds: DataSource;
  let ownerId: string;
  let friendId: string;
  let strangerId: string;
  let availableBookId: string;
  let secondBookId: string;

  beforeAll(async () => {
    ds = await getDataSource();
    const owner = await createUser({
      email: ownerEmail,
      passwordHash: "hashed_password_value",
      name: "Borrow Owner",
    });
    const friend = await createUser({
      email: friendEmail,
      passwordHash: "hashed_password_value",
      name: "Borrow Friend",
    });
    const stranger = await createUser({
      email: strangerEmail,
      passwordHash: "hashed_password_value",
      name: "Borrow Stranger",
    });
    ownerId = owner.id;
    friendId = friend.id;
    strangerId = stranger.id;

    // owner and friend become confirmed friends
    await sendInvite(ownerId, friendId);
    await sendInvite(friendId, ownerId);

    availableBookId = (
      await createBook({
        userId: ownerId,
        title: `Borrow Book ${suffix}`,
        author: "Author",
      })
    ).id;
    secondBookId = (
      await createBook({
        userId: ownerId,
        title: `Borrow Book Two ${suffix}`,
        author: "Author",
      })
    ).id;
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      await ds.getRepository(LoanEntity).delete({ ownerId });
      await ds.getRepository(BookEntity).delete({ userId: ownerId });
      const connections = ds.getRepository(FriendConnectionEntity);
      await connections.delete({ requesterId: ownerId });
      await connections.delete({ requesterId: friendId });
      await connections.delete({ addresseeId: ownerId });
      await connections.delete({ addresseeId: friendId });
      const users = ds.getRepository(UserEntity);
      await users.delete({ email: ownerEmail });
      await users.delete({ email: friendEmail });
      await users.delete({ email: strangerEmail });
      await ds.destroy();
    }
  });

  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("returns a sign-in message when no session exists", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const result = await requestBorrowAction(
      null,
      formData({ bookId: availableBookId })
    );

    // then
    expect(result).toBe("You must be signed in to request a book.");
  });

  it("rejects a request for the viewer's own book", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    // when
    const result = await requestBorrowAction(
      null,
      formData({ bookId: availableBookId })
    );

    // then
    expect(result).toBe("You can't borrow your own book.");
  });

  it("rejects a request from a non-friend", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: strangerId } });

    // when
    const result = await requestBorrowAction(
      null,
      formData({ bookId: availableBookId })
    );

    // then
    expect(result).toBe("You can only borrow books from confirmed friends.");
  });

  it("creates a requested loan for a confirmed friend on an available book", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: friendId } });

    // when
    const result = await requestBorrowAction(
      null,
      formData({ bookId: availableBookId })
    );

    // then
    expect(result).toBeNull();
    const row = await findExistingRequest(availableBookId, friendId);
    expect(row).not.toBeNull();
    expect(row?.status).toBe(LoanStatus.REQUESTED);
  });

  it("rejects a duplicate pending request from the same friend", async () => {
    // given
    // friendId already has a requested loan on availableBookId

    // when
    mockAuth.mockResolvedValue({ user: { id: friendId } });
    const result = await requestBorrowAction(
      null,
      formData({ bookId: availableBookId })
    );

    // then
    expect(result).toBe("You've already requested this book.");
  });

  it("returns not-found when approving with a non-owner session", async () => {
    // given
    const row = await findExistingRequest(availableBookId, friendId);

    // when
    mockAuth.mockResolvedValue({ user: { id: friendId } });
    const result = await approveRequestAction(
      null,
      formData({ loanId: row!.id })
    );

    // then
    expect(result).toBe(
      "Request not found or you don't have permission to do that."
    );
  });

  it("approves the request for the owner, activating the loan", async () => {
    // given
    const row = await findExistingRequest(availableBookId, friendId);

    // when
    mockAuth.mockResolvedValue({ user: { id: ownerId } });
    const result = await approveRequestAction(
      null,
      formData({ loanId: row!.id })
    );

    // then
    expect(result).toBeNull();
    const active = await findActiveLoanForBook(availableBookId);
    expect(active?.id).toBe(row!.id);
    expect(active?.startedAt).toBeInstanceOf(Date);
  });

  it("rejects a new request for the same book once it is on loan", async () => {
    // given
    // availableBookId now has an active loan

    // when
    mockAuth.mockResolvedValue({ user: { id: strangerId } });
    await sendInvite(ownerId, strangerId);
    await sendInvite(strangerId, ownerId);
    const result = await requestBorrowAction(
      null,
      formData({ bookId: availableBookId })
    );

    // then
    expect(result).toBe("This book is already on loan.");
  });

  it("declines a pending request for the owner", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: friendId } });
    const requestResult = await requestBorrowAction(
      null,
      formData({ bookId: secondBookId })
    );
    expect(requestResult).toBeNull();
    const pending = await findExistingRequest(secondBookId, friendId);

    // when
    mockAuth.mockResolvedValue({ user: { id: ownerId } });
    const result = await declineRequestAction(
      null,
      formData({ loanId: pending!.id })
    );

    // then
    expect(result).toBeNull();
  });

  it("allows the same borrower to re-request after a decline", async () => {
    // given
    // secondBookId's request from friendId was just declined

    // when
    mockAuth.mockResolvedValue({ user: { id: friendId } });
    const result = await requestBorrowAction(
      null,
      formData({ bookId: secondBookId })
    );

    // then
    expect(result).toBeNull();
    const row = await findExistingRequest(secondBookId, friendId);
    expect(row).not.toBeNull();
  });

  it("maps a concurrent approval race to the already-borrowed message", async () => {
    // given
    // secondBookId has one requested loan from friendId (re-requested above);
    // create a second requested loan from strangerId for the same book
    mockAuth.mockResolvedValue({ user: { id: strangerId } });
    const secondRequest = await requestBorrowAction(
      null,
      formData({ bookId: secondBookId })
    );
    expect(secondRequest).toBeNull();

    const first = await findExistingRequest(secondBookId, friendId);
    const second = await findExistingRequest(secondBookId, strangerId);

    // when
    mockAuth.mockResolvedValue({ user: { id: ownerId } });
    const firstApproval = await approveRequestAction(
      null,
      formData({ loanId: first!.id })
    );
    const secondApproval = await approveRequestAction(
      null,
      formData({ loanId: second!.id })
    );

    // then
    expect(firstApproval).toBeNull();
    expect(secondApproval).toBe("This book is already on loan.");
  });

  it("rejects a concurrent double-submit with the duplicate-request message", async () => {
    // given
    // a fresh book with no loans, requested twice at once by the same borrower
    const raceBookId = (
      await createBook({
        userId: ownerId,
        title: `Borrow Book Race ${suffix}`,
        author: "Author",
      })
    ).id;
    mockAuth.mockResolvedValue({ user: { id: friendId } });

    // when
    const results = await Promise.all([
      requestBorrowAction(null, formData({ bookId: raceBookId })),
      requestBorrowAction(null, formData({ bookId: raceBookId })),
    ]);

    // then
    // the partial unique index admits exactly one pending row; the loser is
    // mapped through isDuplicateError rather than throwing
    expect(results.filter((r) => r === null)).toHaveLength(1);
    expect(results.filter((r) => r === "You've already requested this book."))
      .toHaveLength(1);
  });

  it("returns not-found when declining with a malformed loanId", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    // when
    const result = await declineRequestAction(
      null,
      formData({ loanId: "not-a-uuid" })
    );

    // then
    expect(result).toBe(
      "Request not found or you don't have permission to do that."
    );
  });
});
