import { createHash } from "crypto";
import { DataSource } from "typeorm";
import { getDataSource } from "@/lib/data-source";
import {
  createPasswordResetToken,
  resetPasswordWithToken,
} from "@/server/password-reset/password-reset.repository";
import { PasswordResetTokenEntity } from "@/server/password-reset/password-reset-token.entity";
import { UserEntity } from "@/server/user/user.entity";
import { createUser } from "@/server/user/user.repository";
import { generateId } from "@/lib/generate-id.utils";

describe("password-reset repository", () => {
  const suffix = Date.now();
  let ds: DataSource;

  const userIds: string[] = [];

  async function makeUser(label: string): Promise<string> {
    const user = await createUser({
      email: `password-reset-${label}-${suffix}@example.com`,
      passwordHash: "original_hashed_password",
      name: `Password Reset ${label}`,
    });
    userIds.push(user.id);
    return user.id;
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

  describe("createPasswordResetToken", () => {
    it("invalidates any prior token for the same user, leaving only the latest queryable", async () => {
      // given
      const userId = await makeUser("reissue");

      // when
      const firstToken = await createPasswordResetToken(userId);
      const secondToken = await createPasswordResetToken(userId);

      // then
      expect(firstToken).not.toBe(secondToken);
      const rows = await ds
        .getRepository(PasswordResetTokenEntity)
        .find({ where: { userId } });
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).toBe(
        createHash("sha256").update(secondToken).digest("hex")
      );
    });
  });

  describe("resetPasswordWithToken", () => {
    it("updates the password and deletes the token row on a valid, unexpired token", async () => {
      // given
      const userId = await makeUser("success");
      const rawToken = await createPasswordResetToken(userId);

      // when
      const result = await resetPasswordWithToken(rawToken, "new_hashed_password");

      // then
      expect(result).toBe("success");
      const user = await ds
        .getRepository(UserEntity)
        .findOne({ where: { id: userId } });
      expect(user?.passwordHash).toBe("new_hashed_password");
      const rows = await ds
        .getRepository(PasswordResetTokenEntity)
        .find({ where: { userId } });
      expect(rows).toHaveLength(0);
    });

    it("returns invalid for an unknown token", async () => {
      // when
      const result = await resetPasswordWithToken(
        "not-a-real-token",
        "new_hashed_password"
      );

      // then
      expect(result).toBe("invalid");
    });

    it("returns invalid for an expired token", async () => {
      // given
      const userId = await makeUser("expired");
      const rawToken = "expired-raw-token-value";
      await ds.getRepository(PasswordResetTokenEntity).save({
        id: generateId(),
        userId,
        tokenHash: createHash("sha256").update(rawToken).digest("hex"),
        expiresAt: new Date(Date.now() - 60 * 1000),
      });

      // when
      const result = await resetPasswordWithToken(rawToken, "new_hashed_password");

      // then
      expect(result).toBe("invalid");
      const user = await ds
        .getRepository(UserEntity)
        .findOne({ where: { id: userId } });
      expect(user?.passwordHash).toBe("original_hashed_password");
    });

    it("returns invalid when the same token is replayed after being consumed", async () => {
      // given
      const userId = await makeUser("replay");
      const rawToken = await createPasswordResetToken(userId);
      const firstResult = await resetPasswordWithToken(
        rawToken,
        "new_hashed_password"
      );
      expect(firstResult).toBe("success");

      // when
      const secondResult = await resetPasswordWithToken(
        rawToken,
        "another_hashed_password"
      );

      // then
      expect(secondResult).toBe("invalid");
      const user = await ds
        .getRepository(UserEntity)
        .findOne({ where: { id: userId } });
      expect(user?.passwordHash).toBe("new_hashed_password");
    });
  });
});
