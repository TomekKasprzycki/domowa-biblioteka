import { getDataSource } from "@/lib/data-source";
import { generateId } from "@/lib/generate-id.utils";
import { BookEntity } from "./book.entity";

export async function createBook(data: {
  userId: string;
  title: string;
  author: string;
  notes?: string;
}): Promise<BookEntity> {
  const ds = await getDataSource();
  const repo = ds.getRepository<BookEntity>("books");
  const book = repo.create({ ...data, id: generateId() });
  return repo.save(book);
}

export async function findByUserId(userId: string): Promise<BookEntity[]> {
  const ds = await getDataSource();
  const repo = ds.getRepository<BookEntity>("books");
  return repo.find({ where: { userId }, order: { createdAt: "DESC" } });
}

export async function updateBook(
  id: string,
  userId: string,
  data: Partial<{ title: string; author: string; notes: string | null }>
): Promise<BookEntity | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository<BookEntity>("books");
  const result = await repo.update({ id, userId }, data);
  if (!result.affected) return null;
  return repo.findOne({ where: { id, userId } });
}

export async function deleteBook(
  id: string,
  userId: string
): Promise<boolean> {
  const ds = await getDataSource();
  const repo = ds.getRepository<BookEntity>("books");
  const result = await repo.delete({ id, userId });
  return !!result.affected;
}
