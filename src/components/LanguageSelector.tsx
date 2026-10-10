import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguagesIcon } from 'lucide-react';
import { useLanguage } from '../i18n/useLanguage';

interface LanguageSelectorProps {
  /** "buttons": two big choices (first screen, onboarding). "select": compact (menus). */
  variant?: 'buttons' | 'select';
  tone?: 'light' | 'dark';
  className?: string;
}

/** English / Hausa, each written in its own language. Changes the whole app at once and remembers it. */
export function LanguageSelector({ variant = 'select', tone = 'light', className = '' }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const { language, setLanguage, languages } = useLanguage();
  const id = useId();

  if (variant === 'buttons') {
    return (
      <fieldset className={className}>
        <legend className="mb-2 flex items-center gap-1.5 text-sm font-bold text-muted">
          <LanguagesIcon className="h-4 w-4" aria-hidden="true" />
          {t('language.choose')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {languages.map((l) =>
          <button
            key={l.id}
            type="button"
            lang={l.id}
            aria-pressed={language === l.id}
            onClick={() => void setLanguage(l.id)}
            className={`min-w-[7rem] flex-1 rounded-xl border-2 px-4 py-3 text-[15px] font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
            language === l.id ? 'border-pine bg-[#E3EEEC] text-pine' : 'border-line bg-white text-ink hover:border-ink/30'}`
            }>

              {l.nativeName}
            </button>
          )}
        </div>
      </fieldset>);

  }

  const dark = tone === 'dark';
  return (
    <div className={className}>
      <label htmlFor={id} className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${dark ? 'text-white/50' : 'text-muted'}`}>
        <LanguagesIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {t('language.label')}
      </label>
      <select
        id={id}
        value={language}
        onChange={(e) => void setLanguage(e.target.value as typeof language)}
        className={`mt-1 w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 ${dark ? 'border-white/20 bg-pine-deep text-white focus:ring-white/40' : 'border-line bg-white text-ink focus:ring-pine/30'}`}>

        {languages.map((l) =>
        <option key={l.id} value={l.id} lang={l.id}>{l.nativeName}</option>
        )}
      </select>
    </div>);

}
