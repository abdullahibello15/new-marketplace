import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, PartyPopperIcon } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { buttonClasses } from '../../../../components/ui/buttonStyles';
import { useCompletenessCardPref, useProfileCompleteness } from '../../hooks/useProfileCompleteness';
import { completenessLabel, missingItems } from '../../utils/completeness';
import { CompletenessRing } from './CompletenessRing';
import { completenessItemText } from './itemText';

/**
 * Dashboard card: the vendor's profile score, its label and the missing items (most valuable first),
 * each with a hint and a button straight to where it's fixed. At 100% it celebrates once, then stays
 * hidden on later visits (the vendor can show it again from Edit Profile). Never blocks anything.
 */
export function CompletenessCard() {
  const { t } = useTranslation('vendor');
  const { data, status, error, reload } = useProfileCompleteness();
  const { pref, setPref } = useCompletenessCardPref();
  const [celebrating, setCelebrating] = useState(false);
  const score = data?.score ?? null;

  // First time at 100%: celebrate now, and keep the card hidden from the next visit on.
  useEffect(() => {
    if (score === 100 && pref === 'auto') {
      setCelebrating(true);
      setPref('hidden');
    }
  }, [score, pref, setPref]);

  if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  if (!data) return <LoadingState label={t('completeness.loading')} rows={1} rowClassName="h-36" />;
  if (data.score === 100 && !celebrating && pref !== 'shown') return null;

  if (data.score === 100) {
    return (
      <section aria-labelledby="completeness-heading" role="status" className="flex items-start gap-4 rounded-2xl border border-pine/30 bg-[#E3EEEC] p-4 lg:p-5">
        <PartyPopperIcon className="mt-0.5 h-6 w-6 shrink-0 text-pine" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="completeness-heading" className="font-bold text-ink">{t('completeness.celebrateTitle')}</h2>
          <p className="mt-1 text-sm text-muted">{t('completeness.celebrateText')}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setCelebrating(false);
            setPref('hidden');
          }}>

          {t('completeness.hide')}
        </Button>
      </section>);

  }

  const label = completenessLabel(data.score);
  const missing = missingItems(data);

  return (
    <section aria-labelledby="completeness-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div className="flex items-center gap-4">
        <CompletenessRing score={data.score} label={t('completeness.ringLabel', { percent: data.score })} />
        <div className="min-w-0 flex-1">
          <h2 id="completeness-heading" className="flex flex-wrap items-center gap-2 font-bold text-ink">
            {t('completeness.title')}
            <Badge tone={label === 'gettingStarted' ? 'warning' : 'success'}>{t(`completeness.label.${label}`)}</Badge>
          </h2>
          <p className="mt-1 text-sm text-muted">{t('completeness.privateNote')}</p>
        </div>
      </div>

      <h3 className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">{t('completeness.missingHeading')}</h3>
      <ul className="mt-2 divide-y divide-line">
        {missing.map((item) => {
          const text = completenessItemText(t, item);
          return (
            <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                  {text.label}
                  <span className="text-xs font-semibold text-pine">{t('completeness.points', { points: item.weight })}</span>
                </p>
                <p className="mt-0.5 text-sm text-muted">{text.hint}</p>
              </div>
              <Link to={item.link} aria-label={t('completeness.fixAria', { item: text.label })} className={`${buttonClasses({ variant: 'secondary', size: 'sm' })} self-start sm:self-auto`}>
                {t('completeness.fix')}
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>);

        })}
      </ul>
    </section>);

}
