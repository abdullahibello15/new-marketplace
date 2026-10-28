/** 2000 or "2000" → "2,000": how whole-Naira inputs display as the user types. Non-digits are dropped. */
export function formatNumberInput(value: number | string): string {
  const digits = String(value).replace(/[^\d]/g, '');
  return digits ? Number(digits).toLocaleString('en-NG') : '';
}

/** "₦2,000" → 2000; blank → null. Returns NaN for anything that isn't a whole number, so callers can report it. */
export function parseNumberInput(raw: string): number | null {
  const cleaned = raw.replace(/[₦,\s]/g, '');
  if (!cleaned) return null;
  return /^\d+$/.test(cleaned) ? Number(cleaned) : NaN;
}
