import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APP_LANGUAGES, DEFAULT_LANGUAGE, NAMESPACES, isAppLanguage, type AppLanguage } from './config';
import { initialLanguage } from './detect';
import { resources } from './resources';

/*
 * i18next setup (react-i18next). All translations are bundled, so switching language is instant and works
 * offline. Missing keys fall back to English; in development each one is logged once.
 */
const warned = new Set<string>();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: APP_LANGUAGES.map((l) => l.id),
  ns: [...NAMESPACES],
  defaultNS: 'common',
  fallbackNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: (languages, namespace, key) => {
    const id = `${languages.join(',')}:${namespace}:${key}`;
    if (import.meta.env.DEV && !warned.has(id)) {
      warned.add(id);
      console.warn(`[i18n] Missing translation "${namespace}:${key}" for ${languages.join(', ')}; showing English.`);
    }
  },
  react: { useSuspense: false }
});

function applyHtmlLang(language: string) {
  if (typeof document === 'undefined') return;
  const lang = APP_LANGUAGES.find((l) => l.id === language);
  document.documentElement.lang = lang?.htmlLang ?? 'en-NG';
}

applyHtmlLang(i18n.language);
i18n.on('languageChanged', applyHtmlLang);

/** The UI language right now. */
export const currentLanguage = (): AppLanguage => isAppLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : DEFAULT_LANGUAGE;

export default i18n;
