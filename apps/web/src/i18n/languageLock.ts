import i18n, { currentLanguage } from './index';
import { DEFAULT_LANGUAGE, type AppLanguage } from './config';

/*
 * Some areas are English only (the admin console and the investor ledger). While one is open the UI shows
 * English, including shared badges and labels inside it; leaving it brings back the person's language.
 * Choosing a language meanwhile (or signing in with a saved one) is remembered and applied on the way out.
 */
let openAreas = 0;
let preferred: AppLanguage | null = null;

/** Switches the UI language, unless an English-only area is open; then it's applied when the area closes. */
export function applyLanguage(language: AppLanguage): Promise<unknown> {
  if (openAreas > 0) {
    preferred = language;
    return Promise.resolve();
  }
  return i18n.changeLanguage(language);
}

/** Called when an English-only area opens. */
export function enterEnglishOnly(): void {
  if (openAreas === 0) preferred = currentLanguage();
  openAreas += 1;
  if (i18n.resolvedLanguage !== DEFAULT_LANGUAGE) void i18n.changeLanguage(DEFAULT_LANGUAGE);
}

/** Called when it closes: the last one to close restores the person's language. */
export function leaveEnglishOnly(): void {
  openAreas -= 1;
  if (openAreas === 0 && preferred && preferred !== i18n.resolvedLanguage) void i18n.changeLanguage(preferred);
}
