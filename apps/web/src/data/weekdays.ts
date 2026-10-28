import type { Weekday, WorkingHours } from '../types/marketplace';

export const weekdays: {id: Weekday;label: string;short: string;}[] = [
{ id: 'mon', label: 'Monday', short: 'Mon' },
{ id: 'tue', label: 'Tuesday', short: 'Tue' },
{ id: 'wed', label: 'Wednesday', short: 'Wed' },
{ id: 'thu', label: 'Thursday', short: 'Thu' },
{ id: 'fri', label: 'Friday', short: 'Fri' },
{ id: 'sat', label: 'Saturday', short: 'Sat' },
{ id: 'sun', label: 'Sunday', short: 'Sun' }];


const DEFAULT_OPEN = '08:00';
const DEFAULT_CLOSE = '18:00';

/** Builds a full week. Days left out of `open` are closed (with default times kept for re-opening). */
export function makeWorkingHours(open: Partial<Record<Weekday, [string, string]>>): WorkingHours {
  return Object.fromEntries(
    weekdays.map(({ id }) => {
      const times = open[id];
      return [id, { open: Boolean(times), opensAt: times?.[0] ?? DEFAULT_OPEN, closesAt: times?.[1] ?? DEFAULT_CLOSE }];
    })
  ) as WorkingHours;
}
