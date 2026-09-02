export function pluralizePl(
  count: number,
  forms: [one: string, few: string, many: string]
): string {
  const [one, few, many] = forms;
  if (count === 1) return one;

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    !(lastTwoDigits >= 12 && lastTwoDigits <= 14)
  ) {
    return few;
  }

  return many;
}
