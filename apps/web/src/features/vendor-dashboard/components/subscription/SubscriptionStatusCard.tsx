import { Trans, useTranslation } from 'react-i18next';
import { planName, subscriptionStatusLabel } from '../../../../i18n/labels';
import { formatDate } from '../../../../utils/format';
import { RefreshCwIcon } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Price } from '../../../../components/ui/Price';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_STATUS_META } from '../../constants';
import { describeDaysLeft } from '../../utils/subscription';
import { translate } from '../../../../i18n/message';
import type { Subscription, SubscriptionPlan, SubscriptionStatus } from '../../types';

interface SubscriptionStatusCardProps {
  plan: SubscriptionPlan;
  subscription: Subscription;
  status: SubscriptionStatus;
  daysLeft: number;
  /** A paid downgrade waiting to start, if any. */
  scheduledPlan: SubscriptionPlan | null;
  onRenew: () => void;
}

export function SubscriptionStatusCard({ plan, subscription, status, daysLeft, scheduledPlan, onRenew }: SubscriptionStatusCardProps) {
  const { t } = useTranslation('vendor');
  const meta = SUBSCRIPTION_STATUS_META[status];
  const lapsed = status === SUBSCRIPTION_STATUS.Grace || status === SUBSCRIPTION_STATUS.Suspended;
  const covered = subscription.coveredBy && !subscription.coveredBy.removed ? subscription.coveredBy : null;

  return (
    <section aria-labelledby="current-plan-heading" className="rounded-2xl bg-pine-deep p-5 text-white lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white/75">{t('subscription.card.current')}</p>
          <h2 id="current-plan-heading" className="mt-0.5 text-2xl font-extrabold tracking-tight">{planName(plan.id, plan.name)}</h2>
          <p className="mt-0.5 text-sm text-white/75">
            <Price amount={plan.price} /> {t('subscription.plan.perMonth')}
          </p>
        </div>
        <Badge tone={meta.tone} dot>{subscriptionStatusLabel(status, meta.label)}</Badge>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
        <div>
          <dt className="text-sm text-white/75">{lapsed ? t('subscription.card.endedOn') : t('subscription.card.renewsOn')}</dt>
          <dd className="mt-0.5 font-bold">{formatDate(subscription.renewsOn, 'EEE d MMM yyyy')}</dd>
        </div>
        <div>
          <dt className="text-sm text-white/75">{t('subscription.card.timeLeft')}</dt>
          <dd className="mt-0.5 font-bold">{translate(describeDaysLeft(daysLeft))}</dd>
        </div>
      </dl>

      {scheduledPlan && subscription.scheduledChange &&
      <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-sm">
          <Trans
          t={t}
          i18nKey="subscription.card.switching"
          values={{ plan: planName(scheduledPlan.id, scheduledPlan.name), date: formatDate(subscription.scheduledChange.effectiveAt, 'd MMM yyyy') }}
          components={{ strong: <strong /> }} />

        </p>
      }

      {covered ?
      <p className="mt-5 rounded-lg bg-white/10 px-3 py-3 text-sm">
          <strong className="block text-base">{t('subscription.card.coveredBy', { name: covered.associationName })}</strong>
          {t('subscription.card.coveredText', { date: formatDate(covered.until, 'EEE d MMM yyyy') })}
        </p> :

      <>
          <Button variant="highlight" icon={RefreshCwIcon} onClick={onRenew} fullWidth className="mt-5">
            {t('subscription.card.renewFor')} <Price amount={plan.price} />
          </Button>
          <p className="mt-2 text-center text-xs text-white/70">
            {t('subscription.card.manual')}
          </p>
        </>
      }
    </section>);

}
