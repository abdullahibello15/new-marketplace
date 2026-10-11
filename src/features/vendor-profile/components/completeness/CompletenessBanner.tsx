import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { SparklesIcon } from 'lucide-react';
import { buttonClasses } from '../../../../components/ui/buttonStyles';
import { PROFILE_ROUTE } from '../../constants';
import { useProfileCompleteness } from '../../hooks/useProfileCompleteness';
import { missingItems, needsCompletenessReminder } from '../../utils/completeness';

/** Pages that already show the score (dashboard card, editor nav), so the banner stays off them. */
const SHOWS_SCORE = ['/pro', '/pro/', PROFILE_ROUTE];

/**
 * A gentle reminder across the vendor portal while the profile is below the threshold in
 * completenessConfig.ts. It only links to the most valuable fix; nothing is ever blocked.
 */
export function CompletenessBanner() {
  const { t } = useTranslation('vendor');
  const { pathname } = useLocation();
  const { data } = useProfileCompleteness();
  if (!data || !needsCompletenessReminder(data.score) || SHOWS_SCORE.includes(pathname)) return null;
  const next = missingItems(data)[0];

  return (
    <div className="mx-auto max-w-6xl px-5 pt-4 lg:px-10 print:hidden">
      <section aria-labelledby="completeness-banner-heading" className="flex flex-col gap-3 rounded-2xl border border-mustard/60 bg-[#F7EBCB] px-4 py-3 text-ink sm:flex-row sm:items-center lg:px-5">
        <SparklesIcon className="h-5 w-5 shrink-0 text-mustard-dark" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="completeness-banner-heading" className="font-bold">{t('completeness.banner.title', { percent: data.score })}</h2>
          <p className="text-sm">{t('completeness.banner.text')}</p>
        </div>
        <Link to={next?.link ?? PROFILE_ROUTE} className={buttonClasses({ variant: 'accent', size: 'sm' })}>
          {t('completeness.banner.action')}
        </Link>
      </section>
    </div>);

}
