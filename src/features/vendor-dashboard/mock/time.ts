/** ISO timestamp `dayOffset` days from today at the given local time, so mock data always looks current. */
export function daysFromNow(dayOffset: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** ISO timestamp `minutes` ago. */
export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}
