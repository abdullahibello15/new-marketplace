import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, isAppLanguage, type AppLanguage } from './config';

/** The visitor's saved choice, if any. */
export function storedLanguage(): AppLanguage | null {
  try {
    const v = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isAppLanguage(v) ? v : null;
  } catch {
    return null;
  }
}

export function storeLanguage(language: AppLanguage) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage blocked: the choice lasts until the tab closes.
  }
}

/** First language from the browser we support ("ha", "ha-NG" → Hausa), else English. */
export function browserLanguage(): AppLanguage {
  const list = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of list) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isAppLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

/** Starting language: what they chose before, then the browser's language, then English. */
export const initialLanguage = (): AppLanguage => storedLanguage() ?? browserLanguage();
