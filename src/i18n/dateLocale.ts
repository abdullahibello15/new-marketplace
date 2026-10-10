import { enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';

/*
 * date-fns has no Hausa locale, so this is a small one: month and weekday names, morning/evening, and
 * "5 minutes ago". Patterns (d MMM yyyy, h:mm a…) stay the same as English, so layouts don't change.
 * Every word here is listed in src/locales/ha/REVIEW.md for a native speaker to check.
 */

const MONTHS_WIDE = ['Janairu', 'Faburairu', 'Maris', 'Afirilu', 'Mayu', 'Yuni', 'Yuli', 'Agusta', 'Satumba', 'Oktoba', 'Nuwamba', 'Disamba'];
const MONTHS_SHORT = ['Jan', 'Fab', 'Mar', 'Afi', 'May', 'Yun', 'Yul', 'Agu', 'Sat', 'Okt', 'Nuw', 'Dis'];
const DAYS_WIDE = ['Lahadi', 'Litinin', 'Talata', 'Laraba', 'Alhamis', 'Jumma’a', 'Asabar'];
const DAYS_SHORT = ['Lah', 'Lit', 'Tal', 'Lar', 'Alh', 'Jum', 'Asa'];

type Width = 'narrow' | 'short' | 'abbreviated' | 'wide';
const pick = (wide: string[], short: string[]) => (index: number, options?: {width?: Width;}) => {
  const width = options?.width ?? 'wide';
  if (width === 'wide') return wide[index];
  if (width === 'narrow') return short[index].slice(0, 1);
  return short[index];
};

/** Morning / evening, as said in Minna: "8:00 na safe", "4:30 na yamma". */
const dayPeriod = (value: string) => {
  if (value === 'am' || value === 'morning') return 'na safe';
  if (value === 'pm' || value === 'afternoon' || value === 'evening') return 'na yamma';
  if (value === 'night') return 'na dare';
  if (value === 'noon') return 'rana tsaka';
  if (value === 'midnight') return 'tsakar dare';
  return value;
};

/** Units for "… ago" / "in …": singular noun then the number ("minti 5"), the everyday Hausa way. */
const UNITS: Record<string, string> = {
  lessThanXSeconds: 'ƙasa da daƙiƙa {{count}}',
  xSeconds: 'daƙiƙa {{count}}',
  halfAMinute: 'rabin minti',
  lessThanXMinutes: 'ƙasa da minti {{count}}',
  xMinutes: 'minti {{count}}',
  aboutXHours: 'kusan awa {{count}}',
  xHours: 'awa {{count}}',
  xDays: 'kwana {{count}}',
  aboutXWeeks: 'kusan mako {{count}}',
  xWeeks: 'mako {{count}}',
  aboutXMonths: 'kusan wata {{count}}',
  xMonths: 'wata {{count}}',
  aboutXYears: 'kusan shekara {{count}}',
  xYears: 'shekara {{count}}',
  overXYears: 'fiye da shekara {{count}}',
  almostXYears: 'kusan shekara {{count}}'
};

export const haLocale: Locale = {
  ...enUS,
  code: 'ha',
  formatDistance: (token, count, options) => {
    const text = (UNITS[token] ?? token).replace('{{count}}', String(count));
    if (!options?.addSuffix) return text;
    return (options.comparison ?? 0) > 0 ? `cikin ${text}` : `${text} da suka wuce`;
  },
  localize: {
    ...enUS.localize,
    month: pick(MONTHS_WIDE, MONTHS_SHORT),
    day: pick(DAYS_WIDE, DAYS_SHORT),
    dayPeriod: (value: string) => dayPeriod(value)
  } as Locale['localize'],
  options: { weekStartsOn: 1, firstWeekContainsDate: 1 }
};
