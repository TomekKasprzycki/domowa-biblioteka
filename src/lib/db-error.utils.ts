import { QueryFailedError } from "typeorm";

export function isDuplicateError(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as { code?: string }).code === "23505"
  );
}

// Postgres 23503: a row still references the one being deleted. Every loans row
// references its book with ON DELETE NO ACTION, so deleting a book that has any
// loan history — closed loans included — raises this.
export function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as { code?: string }).code === "23503"
  );
}
