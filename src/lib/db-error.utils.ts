import { QueryFailedError } from "typeorm";

export function isDuplicateError(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as { code?: string }).code === "23505"
  );
}
