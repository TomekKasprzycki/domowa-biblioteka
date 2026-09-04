import { DataSource } from "typeorm";
import { deleteAccountAction } from "@/app/(app)/account/actions";
import { getDataSource } from "@/lib/data-source";
import { UserEntity } from "@/server/user/user.entity";
import { createUser } from "@/server/user/user.repository";
import { BookEntity } from "@/server/book/book.entity";
import { createBook } from "@/server/book/book.repository";
import { LoanEntity } from "@/server/loan/loan.entity";
import { createLoanRequest, approveLoan } from "@/server/loan/loan.repository";

jest.mock("@/auth", () => ({ auth: jest.fn(), signOut: jest.fn() }));
import { auth, signOut } from "@/auth";

const mockAuth = auth as jest.Mock;
const mockSignOut = signOut as jest.Mock;

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("deleteAccountAction", () => {
  const suffix = Date.now();
  let ds: DataSource;
  const userIds: string[] = [];

  async function makeUser(label: string) {
    const user = await createUser({
      email: `account-action-${label}-${suffix}@example.com`,
      passwordHash: "hashed_password_value",
      name: `Account Action ${label}`,
    });
    userIds.push(user.id);
    return user;
  }

  beforeAll(async () => {
    ds = await getDataSource();
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      for (const id of userIds) {
        await ds.getRepository(LoanEntity).delete({ requesterId: id });
        await ds.getRepository(LoanEntity).delete({ ownerId: id });
        await ds.getRepository(BookEntity).delete({ userId: id });
      }
      for (const id of userIds) {
        await ds.getRepository(UserEntity).delete({ id });
      }
      await ds.destroy();
    }
  }, 20000);

  beforeEach(() => {
    mockAuth.mockReset();
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
  });

  it("returns an auth error when not signed in", async () => {
    // given
    mockAuth.mockResolvedValue(null);

    // when
    const result = await deleteAccountAction(
      null,
      formData({ confirmEmail: "whoever@example.com" })
    );

    // then
    expect(result).toBe("Musisz być zalogowany, aby usunąć konto.");
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("returns a mismatch error and does not delete when confirmEmail is missing", async () => {
    // given
    const user = await makeUser("missing-field");
    mockAuth.mockResolvedValue({ user: { id: user.id, email: user.email } });

    // when
    const result = await deleteAccountAction(null, formData({}));

    // then
    expect(result).toBe(
      "Wpisany adres e-mail nie zgadza się z adresem Twojego konta."
    );
    const stillExists = await ds
      .getRepository(UserEntity)
      .findOne({ where: { id: user.id } });
    expect(stillExists).not.toBeNull();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("returns a mismatch error and does not delete when confirmEmail doesn't match the session email", async () => {
    // given
    const user = await makeUser("mismatch");
    mockAuth.mockResolvedValue({ user: { id: user.id, email: user.email } });

    // when
    const result = await deleteAccountAction(
      null,
      formData({ confirmEmail: `not-${user.email}` })
    );

    // then
    expect(result).toBe(
      "Wpisany adres e-mail nie zgadza się z adresem Twojego konta."
    );
    const stillExists = await ds
      .getRepository(UserEntity)
      .findOne({ where: { id: user.id } });
    expect(stillExists).not.toBeNull();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("returns the blocking message and does not delete while an open loan involves the user", async () => {
    // given
    const owner = await makeUser("blocked-owner");
    const requester = await makeUser("blocked-requester");
    const book = await createBook({
      userId: owner.id,
      title: "Blocked Loan Book",
      author: "Author",
    });
    const loan = await createLoanRequest({
      bookId: book.id,
      requesterId: requester.id,
      ownerId: owner.id,
    });
    await approveLoan(loan.id, owner.id);

    mockAuth.mockResolvedValue({ user: { id: owner.id, email: owner.email } });

    // when
    const result = await deleteAccountAction(
      null,
      formData({ confirmEmail: owner.email })
    );

    // then
    expect(result).toBe(
      "Masz aktywne wypożyczenie lub jedna z Twoich książek jest wypożyczona komuś innemu. Rozwiąż to przed usunięciem konta."
    );
    const stillExists = await ds
      .getRepository(UserEntity)
      .findOne({ where: { id: owner.id } });
    expect(stillExists).not.toBeNull();
    expect(mockSignOut).not.toHaveBeenCalled();
  }, 15000);

  it("deletes a clean account and signs the user out", async () => {
    // given
    const user = await makeUser("clean");
    mockAuth.mockResolvedValue({ user: { id: user.id, email: user.email } });

    // when
    const result = await deleteAccountAction(
      null,
      formData({ confirmEmail: user.email })
    );

    // then
    expect(result).toBeNull();
    expect(mockSignOut).toHaveBeenCalledWith({
      redirectTo: "/?accountDeleted=1",
    });
    const deleted = await ds
      .getRepository(UserEntity)
      .findOne({ where: { id: user.id } });
    expect(deleted).toBeNull();
  });
});
