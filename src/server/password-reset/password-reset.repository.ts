import { randomBytes, createHash } from "crypto";
import { getDataSource } from "@/lib/data-source";
import { generateId } from "@/lib/generate-id.utils";
import { PasswordResetTokenEntity } from "@/server/password-reset/password-reset-token.entity";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  const ds = await getDataSource();
  const repo = ds.getRepository<PasswordResetTokenEntity>(
    "password_reset_tokens"
  );

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await repo.delete({ userId });
  await repo.save(
    repo.create({
      id: generateId(),
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    })
  );

  return rawToken;
}

export async function resetPasswordWithToken(
  rawToken: string,
  newPasswordHash: string
): Promise<"invalid" | "success"> {
  const ds = await getDataSource();
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  return ds.transaction(async (manager) => {
    const row = await manager.findOne<PasswordResetTokenEntity>(
      "password_reset_tokens",
      { where: { tokenHash } }
    );

    if (!row) {
      return "invalid";
    }

    if (row.expiresAt.getTime() < Date.now()) {
      await manager.delete("password_reset_tokens", { userId: row.userId });
      return "invalid";
    }

    await manager.update(
      "users",
      { id: row.userId },
      { passwordHash: newPasswordHash }
    );
    await manager.delete("password_reset_tokens", { userId: row.userId });

    return "success";
  });
}
