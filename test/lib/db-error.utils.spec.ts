import { QueryFailedError } from "typeorm";
import { isDuplicateError } from "@/lib/db-error.utils";

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
