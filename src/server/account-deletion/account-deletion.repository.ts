import { createHash } from "crypto";
import { EntityManager, FindOptionsWhere, In } from "typeorm";
import { getDataSource } from "@/lib/data-source";
import { generateId } from "@/lib/generate-id.utils";
import { isForeignKeyViolation } from "@/lib/db-error.utils";
import { UserEntity } from "@/server/user/user.entity";
import { BookEntity } from "@/server/book/book.entity";
import { FriendConnectionEntity } from "@/server/friend-connection/friend-connection.entity";
import { LoanEntity } from "@/server/loan/loan.entity";
import { OPEN_LOAN_STATUSES } from "@/server/loan/loan.types";
import { AccountDeletionLogEntity } from "@/server/account-deletion/account-deletion-log.entity";
import { DeleteAccountResult } from "@/server/account-deletion/account-deletion.types";

// Every query in this module must go through the manager passed in, not
// getDataSource().getRepository(...). No existing repository function
// (deleteBook, deleteConnection, etc.) can participate in a transaction —
// each opens its own connection via getDataSource(). Reusing one here would
// run it outside the transaction, silently breaking atomicity.
async function hasOpenLoanForUser(
  manager: EntityManager,
  userId: string,
  ownedBookIds: string[]
): Promise<boolean> {
  const repo = manager.getRepository(LoanEntity);
  // The bookId clause is redundant by invariant today: loan.ownerId is always
  // set from book.userId at creation (src/app/borrow/actions.ts) and there is
  // no ownership-transfer path (updateBook cannot write userId). Kept as a
  // deliberate backstop so a future ownership-transfer feature can't silently
  // orphan a loan out of this check.
  const wherePredicates: FindOptionsWhere<LoanEntity>[] = [
    { requesterId: userId, status: In(OPEN_LOAN_STATUSES) },
    { ownerId: userId, status: In(OPEN_LOAN_STATUSES) },
  ];
  if (ownedBookIds.length > 0) {
    wherePredicates.push({
      bookId: In(ownedBookIds),
      status: In(OPEN_LOAN_STATUSES),
    });
  }
  const count = await repo.count({ where: wherePredicates });
  return count > 0;
}

export async function deleteAccount(
  userId: string
): Promise<DeleteAccountResult> {
  const ds = await getDataSource();
  try {
    return await ds.transaction(async (manager) => {
      // ownedBookIds is a snapshot taken once, before the open-loan check and
      // reused for the cascade delete below. A book added by this user on a
      // concurrent connection mid-transaction is invisible to both — but if
      // that book later gets an open loan, deleting it still fails on the
      // same ON DELETE NO ACTION FK and is caught by the isForeignKeyViolation
      // handler below, same as the concurrent-loan race that comment covers.
      const ownedBooks = await manager.find(BookEntity, {
        where: { userId },
        select: { id: true },
      });
      const ownedBookIds = ownedBooks.map((book) => book.id);

      const blocked = await hasOpenLoanForUser(manager, userId, ownedBookIds);
      if (blocked) {
        return "blocked" as const;
      }

      const loanWhere: FindOptionsWhere<LoanEntity>[] = [
        { requesterId: userId },
        { ownerId: userId },
      ];
      if (ownedBookIds.length > 0) {
        loanWhere.push({ bookId: In(ownedBookIds) });
      }
      await manager.delete(LoanEntity, loanWhere);

      await manager.delete(FriendConnectionEntity, [
        { requesterId: userId },
        { addresseeId: userId },
      ]);

      await manager.delete(BookEntity, { userId });

      await manager.delete("password_reset_tokens", { userId });

      const log = manager.getRepository(AccountDeletionLogEntity).create({
        id: generateId(),
        deletedUserIdHash: createHash("sha256").update(userId).digest("hex"),
      });
      await manager.save(log);

      await manager.delete(UserEntity, { id: userId });

      return "deleted" as const;
    });
  } catch (error) {
    // A loan (or other row) referencing this user was inserted concurrently,
    // between our up-front check and the delete — the ON DELETE NO ACTION FK
    // rejects the delete and the whole transaction rolls back. Data integrity
    // holds; report it as a friendly result instead of an unhandled 500.
    if (isForeignKeyViolation(error)) {
      return "conflict";
    }
    throw error;
  }
}
