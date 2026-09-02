import { pluralizePl } from "@/lib/pluralize-pl.utils";

const forms: [string, string, string] = ["książka", "książki", "książek"];

describe("pluralizePl", () => {
  it("returns the 'one' form for a count of 1", () => {
    // given / when
    const result = pluralizePl(1, forms);

    // then
    expect(result).toBe("książka");
  });

  it.each([2, 3, 4, 22, 23, 24, 32])(
    "returns the 'few' form for a count of %i",
    (count) => {
      // given / when
      const result = pluralizePl(count, forms);

      // then
      expect(result).toBe("książki");
    }
  );

  it.each([0, 5, 9, 10, 11, 20, 21, 25, 100])(
    "returns the 'many' form for a count of %i",
    (count) => {
      // given / when
      const result = pluralizePl(count, forms);

      // then
      expect(result).toBe("książek");
    }
  );

  it.each([12, 13, 14, 112, 113, 114])(
    "returns the 'many' form for the 12-14 exception at count %i, not 'few'",
    (count) => {
      // given / when
      const result = pluralizePl(count, forms);

      // then
      expect(result).toBe("książek");
    }
  );
});
