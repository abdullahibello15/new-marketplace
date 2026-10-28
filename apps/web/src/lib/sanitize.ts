// Control characters other than tab and newline.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Cleans free text before it is saved: drops control characters, trailing spaces on each line and
 * runs of blank lines, then trims. React escapes text when rendering, so this is about tidy data,
 * not HTML injection; never render user text with dangerouslySetInnerHTML.
 */
export function sanitizeText(raw: string): string {
  return raw.
  replace(CONTROL_CHARS, '').
  replace(/[ \t]+\n/g, '\n').
  replace(/\n{3,}/g, '\n\n').
  trim();
}

/** Normalises a search box value for case-insensitive matching. */
export function normalizeSearch(raw: string): string {
  return sanitizeText(raw).replace(/\s+/g, ' ').toLowerCase();
}
