import { format } from 'date-fns';
import { AlertTriangleIcon, EyeOffIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { SUBSCRIPTION_STATUS } from '../../constants';
import { BILLING_RULES } from '../../plans';
import { describeDaysLeft } from '../../utils/subscription';
import type { SubscriptionStatus } from '../../types';

interface ExpiryBannerProps {
  status: SubscriptionStatus;
  daysLeft: number;
  renewsOn: string;
  /** When the grace period ends and the profile gets limited. */
  graceEndsAt: Date;
  onRenew: () => void;
}

/** Ends soon → grace period (still visible) → limited (hidden from search, no new requests). Nothing while active. */
export function ExpiryBanner({ status, daysLeft, renewsOn, graceEndsAt, onRenew }: ExpiryBannerProps) {
  if (status === SUBSCRIPTION_STATUS.Active) return null;
  const limited = status === SUBSCRIPTION_STATUS.Expired;
  const grace = status === SUBSCRIPTION_STATUS.Grace;

  const heading = limited ?
  'Your profile is limited' :
  grace ?
  `Your plan has ended. ${BILLING_RULES.graceDays}-day grace period until ${format(graceEndsAt, 'EEE d MMM')}` :
  `Your subscription ends soon: ${describeDaysLeft(daysLeft).toLowerCase()}`;
  const body = limited ?
  'Customers can’t find you in search and can’t send you new requests or orders. Jobs and orders already booked carry on. Renew or choose a plan to restore your profile.' :
  grace ?
  `You’re still visible for now. If you don’t renew by ${format(graceEndsAt, 'EEE d MMM')}, your profile is hidden from search and you won’t get new requests.` :
  `Renew before ${format(new Date(renewsOn), 'EEE d MMM')} to stay visible to customers.`;

  return (
    <section
      aria-labelledby="expiry-banner-heading"
      role={limited ? 'alert' : undefined}
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center lg:px-5 ${
      limited || grace ? 'border-clay/50 bg-clay-soft' : 'border-mustard/60 bg-[#F7EBCB]'}`}>

      {limited ?
      <EyeOffIcon className="h-5 w-5 shrink-0 text-clay-dark" aria-hidden="true" /> :
      <AlertTriangleIcon className={`h-5 w-5 shrink-0 ${grace ? 'text-clay-dark' : 'text-mustard-dark'}`} aria-hidden="true" />
      }
      <div className="min-w-0 flex-1">
        <h2 id="expiry-banner-heading" className="font-bold text-ink">{heading}</h2>
        <p className="mt-0.5 text-sm text-ink/80">{body}</p>
      </div>
      <Button variant={limited || grace ? 'danger' : 'accent'} onClick={onRenew} className="shrink-0">
        Renew now
      </Button>
    </section>);

}
