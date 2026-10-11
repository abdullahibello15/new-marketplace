/*
 * Languages: the ONE list. Names are shown in their own language, so someone who doesn't read the
 * current language can still find theirs.
 */
export const APP_LANGUAGES = [
{ id: 'en', nativeName: 'English', htmlLang: 'en-NG' },
{ id: 'ha', nativeName: 'Hausa', htmlLang: 'ha-NG' }] as
const;

export type AppLanguage = (typeof APP_LANGUAGES)[number]['id'];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

/** Translation files are split by feature so they stay manageable (src/locales/<lang>/<namespace>.json). */
export const NAMESPACES = ['common', 'auth', 'discovery', 'jobs', 'vendor', 'payments', 'admin', 'landing'] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** Where a signed-out visitor's choice is remembered (signed-in users: user.language). */
export const LANGUAGE_STORAGE_KEY = 'gwani:language';

export const isAppLanguage = (v: unknown): v is AppLanguage => APP_LANGUAGES.some((l) => l.id === v);
