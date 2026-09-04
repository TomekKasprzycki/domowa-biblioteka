import { DataSource } from "typeorm";
import {
  requestBorrowAction,
  approveRequestAction,
  declineRequestAction,
  markReturnedAction,
  confirmReturnAction,
} from "@/app/borrow/actions";
import {
  findExistingRequest,
  findOpenLoanForBook,
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
import { revalidatePath } from "next/cache";

const mockAuth = auth as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

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
    expect(result).toBe(
      "Musisz być zalogowany, aby poprosić o wypożyczenie książki."
    );
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
    expect(result).toBe("Nie możesz wypożyczyć własnej książki.");
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
    expect(result).toBe(
      "Możesz wypożyczać książki tylko od potwierdzonych znajomych."
    );
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
    expect(result).toBe("Masz już wysłaną prośbę o tę książkę.");
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
      "Nie znaleziono prośby lub nie masz uprawnień, aby to zrobić."
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
    const active = await findOpenLoanForBook(availableBookId);
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
    expect(result).toBe("Ta książka jest już wypożyczona.");
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
    expect(secondApproval).toBe("Ta książka jest już wypożyczona.");
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
    expect(
      results.filter((r) => r === "Masz już wysłaną prośbę o tę książkę.")
    ).toHaveLength(1);
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
      "Nie znaleziono prośby lub nie masz uprawnień, aby to zrobić."
    );
  });

  it("returns a sign-in message when marking returned with no session", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const result = await markReturnedAction(
      null,
      formData({ loanId: "00000000-0000-0000-0000-000000000000" })
    );

    // then
    expect(result).toBe(
      "Musisz być zalogowany, aby oznaczyć książkę jako zwróconą."
    );
  });

  it("refuses to mark returned with a malformed loanId", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: friendId } });

    // when
    const result = await markReturnedAction(
      null,
      formData({ loanId: "not-a-uuid" })
    );

    // then
    expect(result).toBe(
      "Nie można oznaczyć tego wypożyczenia jako zwróconego — być może już zostało oznaczone."
    );
  });

  it("refuses to mark returned when the owner rather than the borrower asks", async () => {
    // given
    const loan = await findOpenLoanForBook(availableBookId);
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    // when
    const result = await markReturnedAction(
      null,
      formData({ loanId: loan!.id })
    );

    // then
    expect(result).toBe(
      "Nie można oznaczyć tego wypożyczenia jako zwróconego — być może już zostało oznaczone."
    );
  });

  it("marks the loan returned for the borrower and refreshes every loan surface", async () => {
    // given
    const loan = await findOpenLoanForBook(availableBookId);
    mockAuth.mockResolvedValue({ user: { id: friendId } });

    // when
    const result = await markReturnedAction(
      null,
      formData({ loanId: loan!.id })
    );

    // then
    expect(result).toBeNull();
    const row = await ds
      .getRepository(LoanEntity)
      .findOne({ where: { id: loan!.id } });
    expect(row?.status).toBe(LoanStatus.RETURN_PENDING);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/borrowing");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/requests");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/collection");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/discover");
  });

  it("keeps the book unavailable while the return awaits confirmation", async () => {
    // given
    // the loan on availableBookId is return_pending
    mockAuth.mockResolvedValue({ user: { id: friendId } });

    // when
    const result = await requestBorrowAction(
      null,
      formData({ bookId: availableBookId })
    );

    // then
    expect(result).toBe("Ta książka jest już wypożyczona.");
  });

  it("returns a sign-in message when confirming a return with no session", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const result = await confirmReturnAction(
      null,
      formData({ loanId: "00000000-0000-0000-0000-000000000000" })
    );

    // then
    expect(result).toBe("Musisz być zalogowany, aby potwierdzić zwrot.");
  });

  it("refuses to confirm a return when the borrower rather than the owner asks", async () => {
    // given
    const loan = await findOpenLoanForBook(availableBookId);
    mockAuth.mockResolvedValue({ user: { id: friendId } });

    // when
    const result = await confirmReturnAction(
      null,
      formData({ loanId: loan!.id })
    );

    // then
    expect(result).toBe(
      "Nie można potwierdzić tego zwrotu — być może już został potwierdzony."
    );
  });

  it("closes the loan when the owner confirms receipt", async () => {
    // given
    const loan = await findOpenLoanForBook(availableBookId);
    mockAuth.mockResolvedValue({ user: { id: ownerId } });

    // when
    const result = await confirmReturnAction(
      null,
      formData({ loanId: loan!.id })
    );

    // then
    expect(result).toBeNull();
    const row = await ds
      .getRepository(LoanEntity)
      .findOne({ where: { id: loan!.id } });
    expect(row?.status).toBe(LoanStatus.RETURNED);
  });

  it("frees the book for borrowing again once the return is confirmed", async () => {
    // given
    // the loan on availableBookId is closed
    mockAuth.mockResolvedValue({ user: { id: friendId } });

    // when
    const result = await requestBorrowAction(
      null,
      formData({ bookId: availableBookId })
    );

    // then
    expect(result).toBeNull();
  });
});
