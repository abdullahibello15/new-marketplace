import { format } from 'date-fns';
import { AlertTriangleIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { SUBSCRIPTION_STATUS } from '../../constants';
import { describeDaysLeft } from '../../utils/subscription';
import type { SubscriptionStatus } from '../../types';

interface ExpiryBannerProps {
  status: SubscriptionStatus;
  daysLeft: number;
  renewsOn: string;
  onRenew: () => void;
}

/** Shown when 7 days or fewer remain, or after the plan has lapsed. */
export function ExpiryBanner({ status, daysLeft, renewsOn, onRenew }: ExpiryBannerProps) {
  if (status === SUBSCRIPTION_STATUS.Active) return null;
  const expired = status === SUBSCRIPTION_STATUS.Expired;

  return (
    <section
      aria-labelledby="expiry-banner-heading"
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center lg:px-5 ${
      expired ? 'border-clay/50 bg-clay-soft' : 'border-mustard/60 bg-[#F7EBCB]'}`}>

      <AlertTriangleIcon className={`h-5 w-5 shrink-0 ${expired ? 'text-clay-dark' : 'text-mustard-dark'}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 id="expiry-banner-heading" className="font-bold text-ink">
          {expired ? 'Your subscription has expired' : `Your subscription ends soon: ${describeDaysLeft(daysLeft).toLowerCase()}`}
        </h2>
        <p className="mt-0.5 text-sm text-ink/80">
          {expired ?
          'Customers can’t find or book you until you renew.' :
          `Renew before ${format(new Date(renewsOn), 'EEE d MMM')} to stay visible to customers.`}
        </p>
      </div>
      <Button variant={expired ? 'danger' : 'accent'} onClick={onRenew} className="shrink-0">
        Renew now
      </Button>
    </section>);

}
