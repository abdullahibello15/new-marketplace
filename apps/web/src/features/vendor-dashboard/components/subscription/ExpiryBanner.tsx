import { useTranslation } from 'react-i18next';
import { formatDate as format } from '../../../../utils/format';
import { AlertTriangleIcon, BellIcon, PauseCircleIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { SUBSCRIPTION_STATUS } from '../../constants';
import { BILLING_RULES } from '../../plans';
import type { SubscriptionCoverage, SubscriptionStatus } from '../../types';

interface ExpiryBannerProps {
  status: SubscriptionStatus;
  daysLeft: number;
  renewsOn: string;
  /** When the grace period ends and soft suspension starts. */
  graceEndsAt: Date;
  /** An association pays: the vendor can't renew themselves, so no Renew button. */
  coveredBy: SubscriptionCoverage | null;
  renewing: boolean;
  onRenew: () => void;
}

type Urgency = 'notice' | 'warning' | 'urgent' | 'critical';

/** Gets more urgent as the end date nears: a week out → 3 days → last day → grace → suspended. */
function urgencyOf(status: SubscriptionStatus, daysLeft: number): Urgency | null {
  if (status === SUBSCRIPTION_STATUS.Suspended) return 'critical';
  if (status === SUBSCRIPTION_STATUS.Grace) return 'urgent';
  if (status !== SUBSCRIPTION_STATUS.ExpiringSoon) return null;
  if (daysLeft <= 1) return 'urgent';
  return daysLeft <= 3 ? 'warning' : 'notice';
}

const STYLES: Record<Urgency, {box: string;icon: string;button: 'secondary' | 'accent' | 'danger' | 'highlight';}> = {
  notice: { box: 'border-line bg-sand text-ink', icon: 'text-muted', button: 'secondary' },
  warning: { box: 'border-mustard/60 bg-[#F7EBCB] text-ink', icon: 'text-mustard-dark', button: 'accent' },
  urgent: { box: 'border-clay/50 bg-clay-soft text-ink', icon: 'text-clay-dark', button: 'danger' },
  critical: { box: 'border-clay-dark bg-clay-dark text-white', icon: 'text-white', button: 'highlight' }
};

/**
 * The subscription banner across the vendor dashboard. Expiring soon → grace period (fully working) →
 * suspended (still listed, no new requests), with a one-tap Renew. Nothing while comfortably active.
 */
export function ExpiryBanner({ status, daysLeft, renewsOn, graceEndsAt, coveredBy, renewing, onRenew }: ExpiryBannerProps) {
  const { t } = useTranslation('vendor');
  const urgency = urgencyOf(status, daysLeft);
  if (!urgency) return null;
  const style = STYLES[urgency];
  const endDay = format(renewsOn, 'EEE d MMM');
  const graceDay = format(graceEndsAt, 'EEE d MMM');
  const covered = coveredBy !== null && !coveredBy.removed;

  let heading: string;
  let body: string;
  if (status === SUBSCRIPTION_STATUS.Suspended) {
    heading = t('banner.suspendedTitle');
    body = covered ? t('banner.suspendedBundle', { name: coveredBy.associationName }) : t('banner.suspended');
  } else if (status === SUBSCRIPTION_STATUS.Grace) {
    heading = t('banner.graceTitle', { date: graceDay });
    body = covered ?
    t('banner.graceBundle', { name: coveredBy.associationName, end: endDay, grace: graceDay }) :
    t('banner.grace', { end: endDay, days: BILLING_RULES.graceDays, grace: graceDay });
  } else {
    heading = covered ?
    t('banner.bundleRenews', { name: coveredBy.associationName, date: endDay }) :
    daysLeft <= 0 ?
    t('banner.endsToday') :
    t('banner.endsIn', { count: daysLeft });
    body = covered ? t('banner.coveredText') : t('banner.renewBefore', { date: endDay });
  }
  const Icon = status === SUBSCRIPTION_STATUS.Suspended ? PauseCircleIcon : urgency === 'notice' ? BellIcon : AlertTriangleIcon;

  return (
    <section
      aria-labelledby="subscription-banner-heading"
      role={urgency === 'critical' || urgency === 'urgent' ? 'alert' : undefined}
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center lg:px-5 print:hidden ${style.box}`}>

      <Icon className={`h-5 w-5 shrink-0 ${style.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 id="subscription-banner-heading" className="font-bold">{heading}</h2>
        <p className={`mt-0.5 text-sm ${urgency === 'critical' ? 'text-white/90' : 'text-ink/80'}`}>{body}</p>
      </div>
      {!covered &&
      <Button variant={style.button} onClick={onRenew} loading={renewing} className="shrink-0">
          {t('request.renewNow')}
        </Button>
      }
    </section>);

}
