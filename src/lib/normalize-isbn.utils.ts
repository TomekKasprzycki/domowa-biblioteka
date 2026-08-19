function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = isbn[i];
    const value = char === "X" ? 10 : Number(char);
    sum += value * (10 - i);
  }
  return sum % 11 === 0;
}

function isValidIsbn13(isbn: string): boolean {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function normalizeIsbn(raw: string): string | null {
  const stripped = raw.replace(/[\s-]/g, "").toUpperCase();
  if (stripped.length === 10) {
    return isValidIsbn10(stripped) ? stripped : null;
  }
  if (stripped.length === 13) {
    return isValidIsbn13(stripped) ? stripped : null;
  }
  return null;
}
