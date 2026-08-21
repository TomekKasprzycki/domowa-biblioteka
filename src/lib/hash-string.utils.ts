// Ports design.html's hashStr() (lines 697-701) — deterministic small int from
// a string, used wherever the UI needs a stable "same input, same visual" pick
// (Avatar's background color, Spine's color/size) without per-instance config.
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
