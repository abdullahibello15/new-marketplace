import { useTranslation } from 'react-i18next';
import { planFeatureLabel, planName, planTagline } from '../../../../i18n/labels';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Price } from '../../../../components/ui/Price';
import { PlanFeatureValue } from './PlanFeatureValue';
import type { PlanFeature, SubscriptionPlan } from '../../types';

interface PlanCardProps {
  plan: SubscriptionPlan;
  features: PlanFeature[];
  isCurrent: boolean;
  /** Price of the vendor's current plan, to label the button Upgrade or Downgrade. */
  currentPrice: number;
  /** Suspended (grace over): every plan, including the old one, is a new subscription. */
  lapsed: boolean;
  /** An association pays: plans are shown for reference only. */
  covered: boolean;
  onChoose: (plan: SubscriptionPlan) => void;
}

/** One column of the comparison. Every card lists every feature, so plans can be compared row by row. */
export function PlanCard({ plan, features, isCurrent, currentPrice, lapsed, covered, onChoose }: PlanCardProps) {
  const { t } = useTranslation('vendor');
  const headingId = `plan-${plan.id}`;
  const name = planName(plan.id, plan.name);
  const action = lapsed ?
  t('subscription.plan.subscribe', { plan: name }) :
  plan.price > currentPrice ?
  t('subscription.plan.upgrade', { plan: name }) :
  t('subscription.plan.downgrade', { plan: name });

  return (
    <article
      aria-labelledby={headingId}
      className={`flex flex-col rounded-2xl border bg-white p-4 lg:p-5 ${isCurrent ? 'border-pine ring-1 ring-pine' : 'border-line'}`}>

      <div className="flex items-start justify-between gap-2">
        <h3 id={headingId} className="text-lg font-extrabold text-ink">{name}</h3>
        {isCurrent && <Badge tone="success">{t('subscription.plan.yours')}</Badge>}
      </div>
      <p className="mt-1">
        <Price amount={plan.price} className="text-2xl font-extrabold tracking-tight text-ink" />
        <span className="text-sm font-semibold text-muted"> {t('subscription.plan.perMonth')}</span>
      </p>
      <p className="mt-1 text-sm text-muted">{planTagline(plan.id, plan.tagline)}</p>

      <ul className="mt-4 flex-1 divide-y divide-line border-t border-line text-sm">
        {features.map((f) =>
        <li key={f.id} className="flex items-center justify-between gap-3 py-2">
            <span className="text-muted">{planFeatureLabel(f.id, f.label)}</span>
            <span className="flex shrink-0 items-center">
              <PlanFeatureValue value={f.values[plan.id]} />
            </span>
          </li>
        )}
      </ul>

      {!covered && (!isCurrent || lapsed) &&
      <Button variant={lapsed ? 'primary' : 'outline'} fullWidth onClick={() => onChoose(plan)} className="mt-4">
          {action}
        </Button>
      }
    </article>);

}
