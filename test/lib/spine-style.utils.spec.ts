import {
  spineStyleFor,
  splitTitleForTwoColumns,
  SPINE_MIN_HEIGHT,
} from "@/lib/spine-style.utils";
import { hashString } from "@/lib/hash-string.utils";

const PALETTE_SIZE = 12;

// Finds a title whose spineStyleFor color lands on a specific palette index,
// without duplicating the (unexported) palette itself — brute-forces titles
// until one hashes to the target slot.
function titleForPaletteIndex(index: number): string {
  for (let i = 0; i < 1000; i++) {
    const candidate = `Palette probe ${i}`;
    if (hashString(candidate) % PALETTE_SIZE === index) return candidate;
  }
  throw new Error(`No probe title found for palette index ${index}`);
}

describe("spineStyleFor", () => {
  it("gives the same title the same style across calls", () => {
    // given / when
    const first = spineStyleFor("Solaris");
    const second = spineStyleFor("Solaris");

    // then
    expect(first).toEqual(second);
  });

  it("marks light palette entries as onPaper and dark ones as not, consistently per color", () => {
    // given a wide sample of titles, exercising every palette slot
    const titles = Array.from({ length: 50 }, (_, i) => `Title ${i}`);

    // when
    const styles = titles.map(spineStyleFor);

    // then
    const onPaperByColor = new Map<string, boolean>();
    for (const style of styles) {
      const seen = onPaperByColor.get(style.color);
      if (seen === undefined) {
        onPaperByColor.set(style.color, style.onPaper);
      } else {
        expect(style.onPaper).toBe(seen);
      }
    }
    expect(styles.some((s) => s.onPaper)).toBe(true);
    expect(styles.some((s) => !s.onPaper)).toBe(true);
  });

  // Impl review F10a (2026-08-21): pins onPaper against real WCAG contrast
  // for specific palette slots, not just internal consistency, so a future
  // palette edit that flips a color's classification the wrong way fails a
  // test instead of shipping unnoticed.
  it("keeps dark text off the darkest and near-mid palette entries", () => {
    // given palette index 0 (near-black) and 4 (green-500, the borderline
    // contrast case flagged in impl review — white text still contrasts
    // better against it than the dark-text alternative does)
    const darkest = titleForPaletteIndex(0);
    const midGreen = titleForPaletteIndex(4);

    // when / then
    expect(spineStyleFor(darkest).onPaper).toBe(false);
    expect(spineStyleFor(midGreen).onPaper).toBe(false);
  });

  it("switches to dark text on the near-white palette entries", () => {
    // given palette index 7 (#ECF5EC, the mockup's original sole on-paper
    // entry) and index 11 (the palette's lightest blue)
    const nearWhiteGreen = titleForPaletteIndex(7);
    const nearWhiteBlue = titleForPaletteIndex(11);

    // when / then
    expect(spineStyleFor(nearWhiteGreen).onPaper).toBe(true);
    expect(spineStyleFor(nearWhiteBlue).onPaper).toBe(true);
  });

  it("keeps width within the mockup's formula range", () => {
    // given / when
    const { width } = spineStyleFor("Pan Tadeusz");

    // then
    expect(width).toBeGreaterThanOrEqual(32);
    expect(width).toBeLessThan(32 + 9);
  });

  it("keeps a short title's height within the random floor's range", () => {
    // given a 9-character title, well under the 20-character threshold
    // when
    const { height } = spineStyleFor("Cyberiada");

    // then
    expect(height).toBeGreaterThanOrEqual(SPINE_MIN_HEIGHT);
    expect(height).toBeLessThan(SPINE_MIN_HEIGHT + 65);
  });

  it("grows height with title length once a title exceeds 20 characters", () => {
    // given
    const shortTitle = "Cyberiada"; // 9 chars
    const longTitle = "A very very long book title indeed"; // 34 chars

    // when
    const { height: shortHeight } = spineStyleFor(shortTitle);
    const { height: longHeight } = spineStyleFor(longTitle);

    // then
    expect(longHeight).toBeGreaterThan(shortHeight);
  });

  it("guarantees enough height for the full title once past the threshold", () => {
    // given
    const longTitle = "A very very long book title indeed"; // 34 chars

    // when
    const { height } = spineStyleFor(longTitle);

    // then — height must cover the title's own extent plus clearance,
    // not just the random floor
    expect(height).toBeGreaterThanOrEqual(longTitle.length * 7 + 44);
  });

  it("stays single-column at exactly 35 characters", () => {
    // given
    const exactly35 = "x".repeat(35);

    // when
    const { columns } = spineStyleFor(exactly35);

    // then
    expect(columns).toBe(1);
  });

  it("switches to 2 columns and maximum width past 35 characters", () => {
    // given
    const veryLongTitle =
      "An extraordinarily long book title that will not fit in a single column";

    // when
    const { columns, width } = spineStyleFor(veryLongTitle);

    // then
    expect(columns).toBe(2);
    expect(width).toBe(40);
  });

  it("caps a 2-column title's height using half the length, not the full length", () => {
    // given a very long title, so the single-column formula would demand a
    // much taller spine than the 2-column formula does
    const veryLongTitle =
      "An extraordinarily long book title that will not fit in a single column";

    // when
    const { height } = spineStyleFor(veryLongTitle);
    const singleColumnEquivalent = veryLongTitle.length * 7 + 44;

    // then
    expect(height).toBeLessThan(singleColumnEquivalent);
  });

  it("keeps growing height as a 2-column title gets even longer", () => {
    // given — long text should keep affecting height even once split into
    // 2 columns, not plateau at some fixed 2-column cap
    const longTitle =
      "An extraordinarily long book title that will not fit in a single column";
    const muchLongerTitle = `${longTitle} and it just keeps going on and on and on`;

    // when
    const { height: longHeight } = spineStyleFor(longTitle);
    const { height: muchLongerHeight } = spineStyleFor(muchLongerTitle);

    // then
    expect(muchLongerHeight).toBeGreaterThan(longHeight);
  });
});

describe("splitTitleForTwoColumns", () => {
  it("packs the first column with as many whole words as fit the given height", () => {
    // given words of length 5,4,5,5,7 — a budget of 18 chars fits the first
    // three ("Alpha Beta Gamma" = 16) but not a fourth ("+Delta" = 22)
    const title = "Alpha Beta Gamma Delta Epsilon";
    const maxHeightPx = 126; // charBudget = floor(126/7) = 18

    // when
    const [first, second] = splitTitleForTwoColumns(title, maxHeightPx);

    // then
    expect(first).toBe("Alpha Beta Gamma");
    expect(second).toBe("Delta Epsilon");
  });

  it("puts everything left over in the second column, even past its own budget", () => {
    // given
    const title =
      "Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa";
    const maxHeightPx = 126; // charBudget = 18

    // when
    const [first, second] = splitTitleForTwoColumns(title, maxHeightPx);

    // then the second column isn't itself re-truncated by this function —
    // that's left to the component's own CSS ellipsis
    expect(first).toBe("Alpha Beta Gamma");
    expect(second).toBe("Delta Epsilon Zeta Eta Theta Iota Kappa");
    expect(second.length).toBeGreaterThan(18);
  });

  it("never splits a word, even when the first word alone exceeds the budget", () => {
    // given a 30-character first word and a budget of only 10 characters
    const title = `${"A".repeat(30)} short`;
    const maxHeightPx = 70; // charBudget = 10

    // when
    const [first, second] = splitTitleForTwoColumns(title, maxHeightPx);

    // then the first word still goes in whole, exceeding the budget
    expect(first).toBe("A".repeat(30));
    expect(second).toBe("short");
  });

  it("recombines to the original words without losing any", () => {
    // given
    const title = "Alpha Beta Gamma Delta Epsilon";
    const maxHeightPx = 126;

    // when
    const [first, second] = splitTitleForTwoColumns(title, maxHeightPx);

    // then
    expect(`${first} ${second}`).toBe(title);
  });

  it("keeps a spaceless title whole in the first column", () => {
    // given a single unbroken "word" — no boundary to split on
    const title = "A".repeat(40);
    const maxHeightPx = 70; // charBudget = 10, less than 40

    // when
    const [first, second] = splitTitleForTwoColumns(title, maxHeightPx);

    // then
    expect(first).toBe(title);
    expect(second).toBe("");
  });
});
