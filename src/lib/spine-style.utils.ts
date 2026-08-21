import { hashString } from "@/lib/hash-string.utils";

// Drawn from the app's own green/blue tokens (globals.css's --color-green-*/
// --color-blue-* scale) rather than the mockup's narrower 8-entry
// spinePalette (design.html:696) — with only 8 colors, a handful of books
// collide on the same shade; the full 12-token scale spreads them out while
// staying inside the established palette (no new one-off hex values).
const SPINE_PALETTE = [
  "#10241A", // green-950
  "#17402C", // green-800
  "#1E5138", // green-700
  "#276A47", // green-600
  "#3C8759", // green-500
  "#A6CFAF", // green-300
  "#DCEEDF", // green-150
  "#ECF5EC", // green-100
  "#285B7E", // blue-700
  "#447B9F", // blue-500
  "#ABCEE2", // blue-300
  "#E7F2F8", // blue-100
] as const;

// `text-green-800` (spine.tsx's TitleColumn) — the dark-text candidate for a
// light spine, same token as SPINE_PALETTE's own green-800 entry above.
const DARK_TEXT_COLOR = "#17402C";
const WHITE_LUMINANCE = 1;

// Clearance below the top decorative line and above the bottom one that the
// title's rotated text must fit inside (see spine.tsx) — exported so both
// files share one definition of "the band the title has to fit in."
export const SPINE_TITLE_TOP_CLEARANCE = 16;
export const SPINE_TITLE_BOTTOM_CLEARANCE = 28;
const CLEARANCE = SPINE_TITLE_TOP_CLEARANCE + SPINE_TITLE_BOTTOM_CLEARANCE;

// Height now depends on title length, not just the mockup's fixed
// height=148+(hash%65) (design.html:705) — a deliberate deviation (per
// user feedback 2026-08-20): titles were truncating far too aggressively
// at the mockup's original scale. Up to 20 characters, height stays
// "random" (hash-derived, same spread as before) but off a taller floor;
// past 20 characters, height grows with the title so it isn't clipped.
// APPROX_CHAR_WIDTH_PX approximates one character's rendered extent once
// rotated into the vertical spine title (in vertical-rl's default
// text-orientation:mixed, a Latin run's vertical extent after rotation
// equals its *unrotated horizontal* width — this is an average-glyph-width
// estimate for font-display at 12.5px/600, not a font-metrics measurement).
const RANDOM_HEIGHT_TITLE_LENGTH = 20;
const APPROX_CHAR_WIDTH_PX = 7;
export const SPINE_MIN_HEIGHT =
  RANDOM_HEIGHT_TITLE_LENGTH * APPROX_CHAR_WIDTH_PX + CLEARANCE;
const RANDOM_HEIGHT_RANGE = 65;

// Past this length, a single vertical column would need an impractically
// tall spine, so the title splits into 2 columns instead (per user feedback
// 2026-08-20) — the spine widens to its formula's own maximum to hold both
// columns side by side, and each column only has to fit ~half the title.
const TWO_COLUMN_TITLE_LENGTH = 35;
const SPINE_MAX_WIDTH = 32 + 8; // matches the width formula's own max (32 + hash%9)

// WCAG 2.x relative luminance (impl review F10a, 2026-08-21): the naive
// version this replaced averaged raw sRGB channel values, which is a
// brightness estimate, not luminance — it happened to classify every current
// palette entry the same way the real formula does, but the margin was
// accidental, not guaranteed for a future palette edit.
function srgbChannelToLinear(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const r = srgbChannelToLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbChannelToLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbChannelToLinear(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio between two relative luminances.
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const DARK_TEXT_LUMINANCE = relativeLuminance(DARK_TEXT_COLOR);

function heightFor(title: string, hash: number, columns: 1 | 2): number {
  const randomHeight = SPINE_MIN_HEIGHT + (hash % RANDOM_HEIGHT_RANGE);
  // 2 columns split the title roughly in half, so each column only needs to
  // fit half the characters.
  const effectiveLength =
    columns === 2 ? Math.ceil(title.length / 2) : title.length;
  if (effectiveLength <= RANDOM_HEIGHT_TITLE_LENGTH) {
    return randomHeight;
  }
  const neededForTitle = effectiveLength * APPROX_CHAR_WIDTH_PX + CLEARANCE;
  return Math.max(randomHeight, neededForTitle);
}

// Splits a title into 2 columns for 2-column rendering (per user feedback
// 2026-08-20): the first column is greedily packed with as many whole words
// as fit within its own max-height — so it never needs an ellipsis — and
// the second column gets literally everything left over, however long that
// is. If the remainder still doesn't fit the second column's max-height,
// that column's own CSS `text-overflow: ellipsis` clips it — ellipsis only
// ever shows at the end of the second column, never the first. Always
// breaks on a word boundary, never mid-word; only a title with no spaces at
// all (a single long word) has no boundary to use.
export function splitTitleForTwoColumns(
  title: string,
  columnMaxHeightPx: number
): [string, string] {
  const words = title.split(" ").filter(Boolean);
  if (words.length === 0) return ["", ""];

  const charBudget = Math.floor(columnMaxHeightPx / APPROX_CHAR_WIDTH_PX);
  const first = [words[0]];
  let used = words[0].length;
  let i = 1;
  for (; i < words.length; i++) {
    const additional = 1 + words[i].length; // joining space + word
    if (used + additional > charBudget) break;
    first.push(words[i]);
    used += additional;
  }
  return [first.join(" "), words.slice(i).join(" ")];
}

export function spineStyleFor(title: string): {
  color: string;
  height: number;
  width: number;
  onPaper: boolean;
  columns: 1 | 2;
} {
  const hash = hashString(title);
  const columns: 1 | 2 = title.length > TWO_COLUMN_TITLE_LENGTH ? 2 : 1;
  const color = SPINE_PALETTE[hash % SPINE_PALETTE.length];
  const height = heightFor(title, hash, columns);
  const width = columns === 2 ? SPINE_MAX_WIDTH : 32 + (hash % 9);
  // Pick whichever text color gives better contrast against this specific
  // background, rather than testing luminance against a fixed threshold —
  // that way a future palette entry can't silently end up under AA for
  // both text colors without at least getting the better of the two.
  const bgLuminance = relativeLuminance(color);
  const onPaper =
    contrastRatio(bgLuminance, DARK_TEXT_LUMINANCE) >
    contrastRatio(bgLuminance, WHITE_LUMINANCE);
  return { color, height, width, onPaper, columns };
}
