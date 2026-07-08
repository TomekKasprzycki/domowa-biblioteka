import { getDataSource } from "@/lib/data-source";
import { UserEntity } from "./user.entity";

export async function findByEmail(
  email: string
): Promise<UserEntity | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository<UserEntity>("users");
  return repo.findOne({ where: { email } });
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<UserEntity> {
  const ds = await getDataSource();
  const repo = ds.getRepository<UserEntity>("users");
  const user = repo.create(data);
  return repo.save(user);
}
