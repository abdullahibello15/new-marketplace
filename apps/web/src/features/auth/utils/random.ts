/** Opaque random tokens and numeric codes (crypto-strength). */
export function randomToken(bytes = 24): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomDigits(length: number): string {
  const a = new Uint32Array(length);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => String(n % 10)).join('');
}
