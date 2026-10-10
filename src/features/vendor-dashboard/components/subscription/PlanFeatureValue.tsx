import { useTranslation } from 'react-i18next';
import { planValueLabel } from '../../../../i18n/labels';
import { CheckIcon, MinusIcon } from 'lucide-react';

/** Tick for included, dash for not included, or the value as text ("Unlimited"). */
export function PlanFeatureValue({ value }: {value: boolean | string;}) {
  const { t } = useTranslation('vendor');
  if (typeof value === 'string') return <span className="font-bold text-ink">{planValueLabel(value)}</span>;
  return value ?
  <>
      <CheckIcon className="h-4 w-4 text-pine" aria-hidden="true" />
      <span className="sr-only">{t('subscription.plan.included')}</span>
    </> :

  <>
      <MinusIcon className="h-4 w-4 text-muted/60" aria-hidden="true" />
      <span className="sr-only">{t('subscription.plan.notIncluded')}</span>
    </>;

}
