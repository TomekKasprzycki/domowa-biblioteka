import { hashString } from "@/lib/hash-string.utils";

describe("hashString", () => {
  it("gives the same value the same hash across calls", () => {
    // given / when
    const first = hashString("Solaris");
    const second = hashString("Solaris");

    // then
    expect(first).toBe(second);
  });

  it("returns a non-negative integer", () => {
    // given / when
    const result = hashString("Cyberiada");

    // then
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
