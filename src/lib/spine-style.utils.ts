import { hashString } from "@/lib/hash-string.utils";

// Ports design.html's spinePalette + spineStyleFor() (lines 696, 702-709)
// verbatim, including the exact height/width formulas — the shelf's visual
// rhythm depends on this specific range, not an approximation of it.
const SPINE_PALETTE = [
  "#17402C",
  "#1E5138",
  "#276A47",
  "#3C8759",
  "#4B8260",
  "#285B7E",
  "#447B9F",
  "#ECF5EC",
] as const;

export function spineStyleFor(title: string): {
  color: string;
  height: number;
  width: number;
  onPaper: boolean;
} {
  const hash = hashString(title);
  const color = SPINE_PALETTE[hash % SPINE_PALETTE.length];
  const height = 148 + (hash % 65);
  const width = 32 + (hash % 9);
  const onPaper = color === SPINE_PALETTE[SPINE_PALETTE.length - 1];
  return { color, height, width, onPaper };
}
