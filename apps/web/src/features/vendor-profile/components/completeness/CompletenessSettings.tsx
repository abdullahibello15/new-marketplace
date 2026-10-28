import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useCompletenessCardPref } from '../../hooks/useProfileCompleteness';

/** Lets the vendor bring back the profile strength card after it was hidden at 100%. */
export function CompletenessSettings() {
  const { t } = useTranslation('vendor');
  const id = useId();
  const { pref, setPref } = useCompletenessCardPref();
  const hidden = pref === 'hidden';
  return (
    <div className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input id={id} type="checkbox" checked={!hidden} onChange={(e) => setPref(e.target.checked ? 'shown' : 'hidden')} aria-describedby={`${id}-hint`} className="mt-0.5 h-5 w-5 shrink-0 accent-pine" />
        <span>
          <span className="block text-sm font-bold text-ink">{t('completeness.settings.show')}</span>
          <span id={`${id}-hint`} className="block text-xs text-muted">{t('completeness.settings.hint')}</span>
        </span>
      </label>
    </div>);

}
