import { generateId } from "@/lib/generate-id.utils";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("generateId", () => {
  it("returns a well-formed UUID", () => {
    expect(generateId()).toMatch(UUID_REGEX);
  });

  it("returns a different value on each call", () => {
    expect(generateId()).not.toBe(generateId());
  });
});
