import { useSubscriptionStanding } from '../../hooks/useSubscriptionStanding';
import { ExpiryBanner } from './ExpiryBanner';

/** The subscription banner shown at the top of every vendor dashboard page (nothing while comfortably active). */
export function VendorSubscriptionBanner() {
  const { standing, renew, renewing } = useSubscriptionStanding();
  if (!standing) return null;
  return (
    <div className="mx-auto max-w-6xl px-5 pt-4 lg:px-10">
      <ExpiryBanner
        status={standing.status}
        daysLeft={standing.daysLeft}
        renewsOn={standing.renewsOn}
        graceEndsAt={standing.graceEndsAt}
        coveredBy={standing.coveredBy}
        renewing={renewing}
        onRenew={() => void renew()} />

    </div>);

}
