import { randomBytes, createHash } from "crypto";
import { getDataSource } from "@/lib/data-source";
import { generateId } from "@/lib/generate-id.utils";
import { PasswordResetTokenEntity } from "@/server/password-reset/password-reset-token.entity";
import { UserEntity } from "@/server/user/user.entity";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  const ds = await getDataSource();
  const repo = ds.getRepository(PasswordResetTokenEntity);

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
    const row = await manager.findOne(PasswordResetTokenEntity, {
      where: { tokenHash },
    });

    if (!row || row.expiresAt.getTime() < Date.now()) {
      return "invalid";
    }

    await manager.update(
      UserEntity,
      { id: row.userId },
      { passwordHash: newPasswordHash }
    );
    await manager.delete(PasswordResetTokenEntity, { userId: row.userId });

    return "success";
  });
}
