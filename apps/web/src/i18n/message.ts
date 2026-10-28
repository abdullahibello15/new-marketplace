import type { DateStyle, Message, MessageParam, Text } from '../domain/message';
import { formatDate, formatNaira } from '../utils/format';
import i18n from './index';

/*
 * Domain messages (domain/message.ts) → text in the current language. Components that show one must
 * call useTranslation() themselves, so they re-render when the language changes (as with labels.ts).
 */

/** The date-fns pattern for each DateStyle, formatted with the current language's locale. */
export const DATE_STYLE_PATTERNS: Record<DateStyle, string> = {
  weekdayDateTime: 'EEE d MMM, h:mm a'
};

function renderParam(param: MessageParam): string | number {
  if (typeof param !== 'object') return param;
  switch (param.type) {
    // Messages carry kobo; formatNaira takes naira.
    case 'money':
      return formatNaira(param.kobo / 100);
    case 'date':
      return formatDate(param.iso, DATE_STYLE_PATTERNS[param.style]);
    case 'message': {
      const text = translate(param.message);
      return param.case === 'lower' ? text.toLowerCase() : text;
    }
  }
}

export function translate(msg: Message): string {
  const params = Object.fromEntries(Object.entries(msg.params ?? {}).map(([name, value]) => [name, renderParam(value)]));
  return i18n.t(msg.key, msg.fallback === undefined ? params : { ...params, defaultValue: msg.fallback });
}

/** A message translated, or data text as written. */
export const renderText = (text: Text): string => (typeof text === 'string' ? text : translate(text));
