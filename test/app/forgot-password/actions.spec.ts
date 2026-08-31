import { DataSource } from "typeorm";
import { getDataSource } from "@/lib/data-source";
import { UserEntity } from "@/server/user/user.entity";
import { createUser } from "@/server/user/user.repository";
import { PasswordResetTokenEntity } from "@/server/password-reset/password-reset-token.entity";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
jest.mock("@/server/password-reset/send-reset-email", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

import { redirect } from "next/navigation";
import { sendPasswordResetEmail } from "@/server/password-reset/send-reset-email";
import { requestPasswordResetAction } from "@/app/forgot-password/actions";

const mockRedirect = redirect as jest.Mock;
const mockSendPasswordResetEmail = sendPasswordResetEmail as jest.Mock;

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("requestPasswordResetAction", () => {
  const suffix = Date.now();
  let ds: DataSource;
  const userIds: string[] = [];

  async function makeUser(label: string) {
    const user = await createUser({
      email: `forgot-password-${label}-${suffix}@example.com`,
      passwordHash: "hashed_password_value",
      name: `Forgot Password ${label}`,
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
        await ds.getRepository(PasswordResetTokenEntity).delete({ userId: id });
      }
      for (const id of userIds) {
        await ds.getRepository(UserEntity).delete({ id });
      }
      await ds.destroy();
    }
  });

  beforeEach(() => {
    mockRedirect.mockClear();
    mockSendPasswordResetEmail.mockReset();
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
  });

  it("returns a validation error and does not redirect for an invalid email", async () => {
    // when
    const result = await requestPasswordResetAction(
      null,
      formData({ email: "not-an-email" })
    );

    // then
    expect(result).toBe("Invalid email address");
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("sends a reset email and redirects for a registered email", async () => {
    // given
    const user = await makeUser("known");

    // when / then
    await expect(
      requestPasswordResetAction(null, formData({ email: user.email }))
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/forgot-password?sent=1");
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      user.email,
      expect.stringContaining("/reset-password?token=")
    );
    const rows = await ds
      .getRepository(PasswordResetTokenEntity)
      .find({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
  });

  it("redirects identically without sending an email for an unregistered email", async () => {
    // when / then
    await expect(
      requestPasswordResetAction(
        null,
        formData({ email: `no-such-user-${suffix}@example.com` })
      )
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/forgot-password?sent=1");
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
