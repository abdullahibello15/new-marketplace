/*
 * What the domain rules say to people, as data: a translation key and its parameters. The rules never
 * build finished text, so they stay free of UI code (BACKEND_PLAN §2) and the API can send the same
 * message to any client. The web app turns one into text with translate() (i18n/message.ts).
 *
 * Units: money inside a message is always kobo ({ type: 'money', kobo }). The amounts the rules compute
 * (fees, prices, ledger amounts) stay whole naira until Phase 4 (BACKEND_PLAN §6); money() is the one
 * place a naira amount becomes kobo, and it refuses amounts that aren't a whole number of kobo.
 *
 * Moves to packages/domain with the rules (Phase 0, step 3).
 */

/** How a date inside a message is shown. The web app maps each style to its date pattern. */
export type DateStyle = 'weekdayDateTime';

export interface MoneyParam {
  type: 'money';
  /** Kobo (₦1 = 100 kobo), never naira. */
  kobo: number;
}

export interface DateParam {
  type: 'date';
  iso: string;
  style: DateStyle;
}

/** Another message used as a parameter (a status or actor label), optionally lower-cased. */
export interface MessageRef {
  type: 'message';
  message: Message;
  case?: 'lower';
}

export type MessageParam = string | number | MoneyParam | DateParam | MessageRef;

export interface Message {
  key: string;
  params?: Record<string, MessageParam>;
  /** Shown when the key has no translation: the English label from the data (see i18n/labels.ts). */
  fallback?: string;
}

/** A message, or plain data shown as written (a product name, a payment description). */
export type Text = Message | string;

export function message(key: string, params?: Record<string, MessageParam>, fallback?: string): Message {
  return { key, ...(params ? { params } : {}), ...(fallback !== undefined ? { fallback } : {}) };
}

/** A whole-naira (or naira-and-kobo) amount as a message parameter, in kobo. */
export function money(naira: number): MoneyParam {
  const kobo = Math.round(naira * 100);
  // Floating point turns ₦1,234.56 into 123455.99999999999 kobo: that rounds. A sub-kobo amount doesn't.
  if (!Number.isFinite(naira) || Math.abs(naira * 100 - kobo) > 1e-6) {
    throw new RangeError(`₦${naira} is not a whole number of kobo`);
  }
  return { type: 'money', kobo: kobo === 0 ? 0 : kobo };
}

export function date(value: Date | string, style: DateStyle): DateParam {
  return { type: 'date', iso: new Date(value).toISOString(), style };
}

export function nested(msg: Message, options: { case?: 'lower' } = {}): MessageRef {
  return { type: 'message', message: msg, ...options };
}

export const isMessage = (value: unknown): value is Message =>
  typeof value === 'object' && value !== null && typeof (value as Message).key === 'string';
