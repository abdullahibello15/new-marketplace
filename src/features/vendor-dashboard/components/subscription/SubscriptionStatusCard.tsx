import { format } from 'date-fns';
import { RefreshCwIcon } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Price } from '../../../../components/ui/Price';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_STATUS_META } from '../../constants';
import { describeDaysLeft } from '../../utils/subscription';
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
  const meta = SUBSCRIPTION_STATUS_META[status];
  const lapsed = status === SUBSCRIPTION_STATUS.Grace || status === SUBSCRIPTION_STATUS.Expired;

  return (
    <section aria-labelledby="current-plan-heading" className="rounded-2xl bg-pine-deep p-5 text-white lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white/75">Current plan</p>
          <h2 id="current-plan-heading" className="mt-0.5 text-2xl font-extrabold tracking-tight">{plan.name}</h2>
          <p className="mt-0.5 text-sm text-white/75">
            <Price amount={plan.price} /> / month
          </p>
        </div>
        <Badge tone={meta.tone} dot>{meta.label}</Badge>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
        <div>
          <dt className="text-sm text-white/75">{lapsed ? 'Ended on' : 'Renews on'}</dt>
          <dd className="mt-0.5 font-bold">{format(new Date(subscription.renewsOn), 'EEE d MMM yyyy')}</dd>
        </div>
        <div>
          <dt className="text-sm text-white/75">Time left</dt>
          <dd className="mt-0.5 font-bold">{describeDaysLeft(daysLeft)}</dd>
        </div>
      </dl>

      {scheduledPlan && subscription.scheduledChange &&
      <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-sm">
          Switching to <strong>{scheduledPlan.name}</strong> on {format(new Date(subscription.scheduledChange.effectiveAt), 'd MMM yyyy')} (already paid).
        </p>
      }

      <Button variant="highlight" icon={RefreshCwIcon} onClick={onRenew} fullWidth className="mt-5">
        Renew for <Price amount={plan.price} />
      </Button>
      <p className="mt-2 text-center text-xs text-white/70">
        Renewal is manual for now: pay by card, bank transfer or USSD. Automatic billing comes later.
      </p>
    </section>);

}
