import bcrypt from "bcryptjs";
import { DataSource } from "typeorm";
import { getDataSource } from "@/lib/data-source";
import { UserEntity } from "@/server/user/user.entity";
import { createUser } from "@/server/user/user.repository";
import { PasswordResetTokenEntity } from "@/server/password-reset/password-reset-token.entity";
import { createPasswordResetToken } from "@/server/password-reset/password-reset.repository";
import { generateId } from "@/lib/generate-id.utils";
import { createHash } from "crypto";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { redirect } from "next/navigation";
import { resetPasswordAction } from "@/app/reset-password/actions";

const mockRedirect = redirect as jest.Mock;

const INVALID_LINK_MESSAGE =
  "Ten link jest nieprawidłowy lub wygasł. Poproś o nowy.";

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("resetPasswordAction", () => {
  const suffix = Date.now();
  let ds: DataSource;
  const userIds: string[] = [];

  async function makeUser(label: string) {
    const user = await createUser({
      email: `reset-password-${label}-${suffix}@example.com`,
      passwordHash: "original_hashed_password",
      name: `Reset Password ${label}`,
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
  });

  it("sets the new password and deletes the token row on success", async () => {
    // given
    const user = await makeUser("success");
    const rawToken = await createPasswordResetToken(user.id);

    // when / then
    await expect(
      resetPasswordAction(
        null,
        formData({
          token: rawToken,
          password: "new-password-1",
          confirmPassword: "new-password-1",
        })
      )
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/login?reset=1");
    const updated = await ds
      .getRepository(UserEntity)
      .findOne({ where: { id: user.id } });
    expect(await bcrypt.compare("new-password-1", updated!.passwordHash)).toBe(
      true
    );
    const rows = await ds
      .getRepository(PasswordResetTokenEntity)
      .find({ where: { userId: user.id } });
    expect(rows).toHaveLength(0);
  });

  it("returns a validation error and leaves the password unchanged on mismatched confirmPassword", async () => {
    // given
    const user = await makeUser("mismatch");
    const rawToken = await createPasswordResetToken(user.id);

    // when
    const result = await resetPasswordAction(
      null,
      formData({
        token: rawToken,
        password: "new-password-1",
        confirmPassword: "different-password",
      })
    );

    // then
    expect(result).toBe("Hasła muszą się zgadzać.");
    expect(mockRedirect).not.toHaveBeenCalled();
    const unchanged = await ds
      .getRepository(UserEntity)
      .findOne({ where: { id: user.id } });
    expect(unchanged?.passwordHash).toBe("original_hashed_password");
  });

  it("returns the generic invalid-link message for an expired token", async () => {
    // given
    const user = await makeUser("expired");
    const rawToken = `expired-raw-token-value-${suffix}`;
    await ds.getRepository(PasswordResetTokenEntity).save({
      id: generateId(),
      userId: user.id,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() - 60 * 1000),
    });

    // when
    const result = await resetPasswordAction(
      null,
      formData({
        token: rawToken,
        password: "new-password-1",
        confirmPassword: "new-password-1",
      })
    );

    // then
    expect(result).toBe(INVALID_LINK_MESSAGE);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns the generic invalid-link message when the same token is replayed", async () => {
    // given
    const user = await makeUser("replay");
    const rawToken = await createPasswordResetToken(user.id);

    await expect(
      resetPasswordAction(
        null,
        formData({
          token: rawToken,
          password: "new-password-1",
          confirmPassword: "new-password-1",
        })
      )
    ).rejects.toThrow("NEXT_REDIRECT");

    // when
    const result = await resetPasswordAction(
      null,
      formData({
        token: rawToken,
        password: "another-password",
        confirmPassword: "another-password",
      })
    );

    // then
    expect(result).toBe(INVALID_LINK_MESSAGE);
  });

  it("returns the generic invalid-link message for a missing token", async () => {
    // when
    const result = await resetPasswordAction(
      null,
      formData({
        token: "",
        password: "new-password-1",
        confirmPassword: "new-password-1",
      })
    );

    // then
    expect(result).toBe(INVALID_LINK_MESSAGE);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
