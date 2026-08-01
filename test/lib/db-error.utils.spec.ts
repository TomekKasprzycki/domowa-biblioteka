import { QueryFailedError } from "typeorm";
import {
  isDuplicateError,
  isForeignKeyViolation,
} from "@/lib/db-error.utils";

function pgError(code: string, message: string): QueryFailedError {
  return new QueryFailedError("DELETE ...", [], {
    name: "error",
    message,
    code,
  } as Error & { code: string });
}

describe("isDuplicateError", () => {
  it("returns true for a QueryFailedError with Postgres code 23505", () => {
    // given
    const error = new QueryFailedError("INSERT ...", [], {
      name: "error",
      message: "duplicate key value violates unique constraint",
      code: "23505",
    } as Error & { code: string });

    // when
    const result = isDuplicateError(error);

    // then
    expect(result).toBe(true);
  });

  it("returns false for a QueryFailedError with a different Postgres code", () => {
    // given
    const error = new QueryFailedError("INSERT ...", [], {
      name: "error",
      message: "foreign key violation",
      code: "23503",
    } as Error & { code: string });

    // when
    const result = isDuplicateError(error);

    // then
    expect(result).toBe(false);
  });

  it("returns false for a non-QueryFailedError", () => {
    // given
    const error = new Error("some other error");

    // when
    const result = isDuplicateError(error);

    // then
    expect(result).toBe(false);
  });
});

describe("isForeignKeyViolation", () => {
  it("returns true for a QueryFailedError with Postgres code 23503", () => {
    // given
    const error = pgError(
      "23503",
      'update or delete on table "books" violates foreign key constraint'
    );

    // when
    const result = isForeignKeyViolation(error);

    // then
    expect(result).toBe(true);
  });

  it("returns false for a QueryFailedError with a different Postgres code", () => {
    // given
    const error = pgError("23505", "duplicate key value");

    // when
    const result = isForeignKeyViolation(error);

    // then
    expect(result).toBe(false);
  });

  it("returns false for a non-QueryFailedError", () => {
    // given
    const error = new Error("some other error");

    // when
    const result = isForeignKeyViolation(error);

    // then
    expect(result).toBe(false);
  });
});
