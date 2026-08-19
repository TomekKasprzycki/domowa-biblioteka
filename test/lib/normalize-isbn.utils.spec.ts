import { normalizeIsbn } from "@/lib/normalize-isbn.utils";

describe("normalizeIsbn", () => {
  it.each([
    ["valid ISBN-13", "9780140328721", "9780140328721"],
    ["valid ISBN-10", "0140328726", "0140328726"],
    ["ISBN-10 with X check digit", "080442957X", "080442957X"],
    ["hyphenated ISBN-10", "0-8044-2957-X", "080442957X"],
    ["spaced ISBN-13", "978 0 14 032872 1", "9780140328721"],
  ])("given %s, returns the normalized digits-only string", (_case, raw, expected) => {
    // given a raw ISBN string
    // when normalizing it
    const result = normalizeIsbn(raw);
    // then it returns the canonical form
    expect(result).toBe(expected);
  });

  it.each([
    ["a single-digit typo that fails the checksum", "9780140328722"],
    ["non-numeric input", "not-an-isbn"],
    ["empty string", ""],
  ])("given %s, returns null", (_case, raw) => {
    // given a raw string that is not a valid ISBN
    // when normalizing it
    const result = normalizeIsbn(raw);
    // then it is rejected
    expect(result).toBeNull();
  });
});
