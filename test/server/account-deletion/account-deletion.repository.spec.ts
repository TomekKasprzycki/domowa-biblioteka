import { createHash } from "crypto";
import { DataSource, EntityManager } from "typeorm";
import { QueryFailedError } from "typeorm";
import { getDataSource } from "@/lib/data-source";
import { deleteAccount } from "@/server/account-deletion/account-deletion.repository";
import { AccountDeletionLogEntity } from "@/server/account-deletion/account-deletion-log.entity";
import { UserEntity } from "@/server/user/user.entity";
import { createUser } from "@/server/user/user.repository";
import { BookEntity } from "@/server/book/book.entity";
import { createBook } from "@/server/book/book.repository";
import { FriendConnectionEntity } from "@/server/friend-connection/friend-connection.entity";
import { sendInvite } from "@/server/friend-connection/friend-connection.repository";
import { LoanEntity } from "@/server/loan/loan.entity";
import {
  createLoanRequest,
  approveLoan,
  markReturned,
  confirmReturn,
} from "@/server/loan/loan.repository";

describe("deleteAccount", () => {
  const suffix = Date.now();
  let ds: DataSource;

  const userIds: string[] = [];

  async function makeUser(label: string): Promise<string> {
    const user = await createUser({
      email: `account-deletion-${label}-${suffix}@example.com`,
      passwordHash: "hashed_password_value",
      name: `Account Deletion ${label}`,
    });
    userIds.push(user.id);
    return user.id;
  }

  async function closeLoan(loanId: string, requesterId: string, ownerId: string) {
    await markReturned(loanId, requesterId);
    await confirmReturn(loanId, ownerId);
  }

  beforeAll(async () => {
    ds = await getDataSource();
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      // Cleans up after up to 8 users across all tests above — more
      // sequential round trips than the default 5s hook timeout allows.
      // Best-effort cleanup for every user created across all tests — several
      // tests deliberately leave their user un-deleted (blocked, conflict,
      // atomicity-rollback cases), so children must be cleared before parents
      // for every id, not just the ones deleteAccount itself removed.
      for (const id of userIds) {
        await ds.getRepository(LoanEntity).delete({ requesterId: id });
        await ds.getRepository(LoanEntity).delete({ ownerId: id });
        await ds
          .getRepository(FriendConnectionEntity)
          .delete({ requesterId: id });
        await ds
          .getRepository(FriendConnectionEntity)
          .delete({ addresseeId: id });
        await ds.getRepository(BookEntity).delete({ userId: id });
      }
      for (const id of userIds) {
        await ds.getRepository(UserEntity).delete({ id });
      }
      await ds.destroy();
    }
  }, 20000);

  it("returns blocked while an open loan involves the user as requester or owner", async () => {
    // given
    const userA = await makeUser("blocked-a");
    const userC = await makeUser("blocked-c");
    const userD = await makeUser("blocked-d");

    const bookA1 = await createBook({
      userId: userA,
      title: "A's Book",
      author: "Author A",
    });
    const bookC1 = await createBook({
      userId: userC,
      title: "C's Book",
      author: "Author C",
    });

    // userA borrows from userC (userA is the requester on an open loan)
    const loanAsRequester = await createLoanRequest({
      bookId: bookC1.id,
      requesterId: userA,
      ownerId: userC,
    });
    await approveLoan(loanAsRequester.id, userC);

    // userD borrows userA's own book (userA is the owner on an open loan)
    const loanAsOwner = await createLoanRequest({
      bookId: bookA1.id,
      requesterId: userD,
      ownerId: userA,
    });
    await approveLoan(loanAsOwner.id, userA);

    // when
    const result = await deleteAccount(userA);

    // then
    expect(result).toBe("blocked");
    const stillExists = await ds
      .getRepository(UserEntity)
      .findOne({ where: { id: userA } });
    expect(stillExists).not.toBeNull();
    const bookStillExists = await ds
      .getRepository(BookEntity)
      .findOne({ where: { id: bookA1.id } });
    expect(bookStillExists).not.toBeNull();

    // cleanup for this test's rows
    await closeLoan(loanAsRequester.id, userA, userC);
    await closeLoan(loanAsOwner.id, userD, userA);
  });

  it("deletes the account once no open loan remains, cascading across books, friend connections, and loans, and writes one audit log row", async () => {
    // This test alone performs ~20 sequential DB round trips (4 users, a
    // two-sided friend connection, two full loan lifecycles, the cascade
    // itself, and its assertions) — more than the default 5s timeout allows.
    // given
    const userA = await makeUser("deleted-a");
    const userB = await makeUser("deleted-b");
    const userC = await makeUser("deleted-c");
    const userD = await makeUser("deleted-d");

    const bookA1 = await createBook({
      userId: userA,
      title: "A's Deleted Book",
      author: "Author A",
    });
    const bookC1 = await createBook({
      userId: userC,
      title: "C's Book For Deleted A",
      author: "Author C",
    });

    const connection = await sendInvite(userA, userB);
    if (connection === "duplicate" || connection === "already-friends") {
      throw new Error("unexpected connection result in test setup");
    }
    await sendInvite(userB, userA); // auto-accepts, mirroring the app's flow

    const loanAsRequester = await createLoanRequest({
      bookId: bookC1.id,
      requesterId: userA,
      ownerId: userC,
    });
    await approveLoan(loanAsRequester.id, userC);
    await closeLoan(loanAsRequester.id, userA, userC);

    const loanAsOwner = await createLoanRequest({
      bookId: bookA1.id,
      requesterId: userD,
      ownerId: userA,
    });
    await approveLoan(loanAsOwner.id, userA);
    await closeLoan(loanAsOwner.id, userD, userA);

    // when
    const result = await deleteAccount(userA);

    // then
    expect(result).toBe("deleted");

    const user = await ds.getRepository(UserEntity).findOne({ where: { id: userA } });
    expect(user).toBeNull();

    const books = await ds.getRepository(BookEntity).find({ where: { userId: userA } });
    expect(books).toHaveLength(0);

    const connectionsAsRequester = await ds
      .getRepository(FriendConnectionEntity)
      .find({ where: { requesterId: userA } });
    const connectionsAsAddressee = await ds
      .getRepository(FriendConnectionEntity)
      .find({ where: { addresseeId: userA } });
    expect(connectionsAsRequester).toHaveLength(0);
    expect(connectionsAsAddressee).toHaveLength(0);

    const loansAsRequester = await ds
      .getRepository(LoanEntity)
      .find({ where: { requesterId: userA } });
    const loansAsOwner = await ds
      .getRepository(LoanEntity)
      .find({ where: { ownerId: userA } });
    expect(loansAsRequester).toHaveLength(0);
    expect(loansAsOwner).toHaveLength(0);

    const expectedHash = createHash("sha256").update(userA).digest("hex");
    const auditRows = await ds
      .getRepository(AccountDeletionLogEntity)
      .find({ where: { deletedUserIdHash: expectedHash } });
    expect(auditRows).toHaveLength(1);

    // remaining users (B, C, D) are untouched
    for (const id of [userB, userC, userD]) {
      const other = await ds.getRepository(UserEntity).findOne({ where: { id } });
      expect(other).not.toBeNull();
    }
  }, 15000);

  it("rolls back every delete when an unrelated error interrupts the transaction", async () => {
    // given
    const userE = await makeUser("atomic-e");
    const bookE1 = await createBook({
      userId: userE,
      title: "E's Book",
      author: "Author E",
    });

    const originalDelete = EntityManager.prototype.delete;
    const spy = jest
      .spyOn(EntityManager.prototype, "delete")
      .mockImplementation(function (
        this: EntityManager,
        target: unknown,
        criteria: unknown
      ) {
        if (target === BookEntity) {
          throw new Error("simulated mid-transaction failure");
        }
        return originalDelete.call(
          this,
          target as Parameters<typeof originalDelete>[0],
          criteria as Parameters<typeof originalDelete>[1]
        );
      });

    try {
      // when / then
      await expect(deleteAccount(userE)).rejects.toThrow(
        "simulated mid-transaction failure"
      );
    } finally {
      spy.mockRestore();
    }

    const user = await ds.getRepository(UserEntity).findOne({ where: { id: userE } });
    expect(user).not.toBeNull();
    const book = await ds.getRepository(BookEntity).findOne({ where: { id: bookE1.id } });
    expect(book).not.toBeNull();
  });

  it("maps a foreign-key violation to a conflict result instead of throwing, and rolls back", async () => {
    // given
    const userF = await makeUser("conflict-f");
    const bookF1 = await createBook({
      userId: userF,
      title: "F's Book",
      author: "Author F",
    });

    const originalDelete = EntityManager.prototype.delete;
    const spy = jest
      .spyOn(EntityManager.prototype, "delete")
      .mockImplementation(function (
        this: EntityManager,
        target: unknown,
        criteria: unknown
      ) {
        if (target === BookEntity) {
          const driverError = Object.assign(
            new Error("simulated fk violation"),
            { code: "23503" }
          );
          throw new QueryFailedError("DELETE", [], driverError);
        }
        return originalDelete.call(
          this,
          target as Parameters<typeof originalDelete>[0],
          criteria as Parameters<typeof originalDelete>[1]
        );
      });

    let result: Awaited<ReturnType<typeof deleteAccount>>;
    try {
      // when
      result = await deleteAccount(userF);
    } finally {
      spy.mockRestore();
    }

    // then
    expect(result).toBe("conflict");
    const user = await ds.getRepository(UserEntity).findOne({ where: { id: userF } });
    expect(user).not.toBeNull();
    const book = await ds.getRepository(BookEntity).findOne({ where: { id: bookF1.id } });
    expect(book).not.toBeNull();
  });

  it("returns deleted for a user with no books, connections, or loans at all", async () => {
    // given
    const userG = await makeUser("bare-g");

    // when
    const result = await deleteAccount(userG);

    // then
    expect(result).toBe("deleted");
    const user = await ds.getRepository(UserEntity).findOne({ where: { id: userG } });
    expect(user).toBeNull();
  });
});
