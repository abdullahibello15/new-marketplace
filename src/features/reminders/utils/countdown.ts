/** "in 23h 04m 12s", or "due now" once the time has passed. For the dev panel's live countdowns. */
export function timeToFire(fireAt: string, now: Date): string {
  const ms = new Date(fireAt).getTime() - now.getTime();
  if (ms <= 0) return 'due now';
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86_400);
  const h = Math.floor(total % 86_400 / 3600);
  const m = Math.floor(total % 3600 / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `in ${d ? `${d}d ` : ''}${h}h ${pad(m)}m ${pad(s)}s`;
}
