const PALETTE = [
  "bg-green-700 text-white",
  "bg-green-600 text-white",
  "bg-green-500 text-white",
  "bg-blue-700 text-white",
  "bg-blue-500 text-white",
  "bg-blue-300 text-green-950",
] as const;

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Mirrors the mockup's own hashStr()/spinePalette pattern (design.html:697-701)
// for "deterministic color from a name" — same person, same color, no config.
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function Avatar({ name }: { name: string }) {
  const initials = getInitials(name);
  const paletteClasses = PALETTE[hashString(name) % PALETTE.length];

  return (
    <div
      aria-hidden="true"
      className={`flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full font-display text-[13px] font-semibold ${paletteClasses}`}
    >
      {initials}
    </div>
  );
}
