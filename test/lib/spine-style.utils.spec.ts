import { spineStyleFor } from "@/lib/spine-style.utils";

describe("spineStyleFor", () => {
  it("gives the same title the same style across calls", () => {
    // given / when
    const first = spineStyleFor("Solaris");
    const second = spineStyleFor("Solaris");

    // then
    expect(first).toEqual(second);
  });

  it("marks the near-white palette entry as onPaper, and every other entry as not", () => {
    // given a wide sample of titles, exercising every palette slot
    const titles = Array.from({ length: 50 }, (_, i) => `Title ${i}`);

    // when
    const styles = titles.map(spineStyleFor);

    // then
    for (const style of styles) {
      expect(style.onPaper).toBe(style.color === "#ECF5EC");
    }
    expect(styles.some((s) => s.onPaper)).toBe(true);
    expect(styles.some((s) => !s.onPaper)).toBe(true);
  });

  it("keeps height and width within the mockup's formula ranges", () => {
    // given / when
    const { height, width } = spineStyleFor("Pan Tadeusz");

    // then
    expect(height).toBeGreaterThanOrEqual(148);
    expect(height).toBeLessThan(148 + 65);
    expect(width).toBeGreaterThanOrEqual(32);
    expect(width).toBeLessThan(32 + 9);
  });
});
