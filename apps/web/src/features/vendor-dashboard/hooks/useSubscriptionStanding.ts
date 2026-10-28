import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { PAYMENT_SUBJECT } from '../../payments/constants';
import { DASHBOARD_ROUTES } from '../constants';
import { getSubscription, renewSubscription } from '../services/subscriptionService';
import { daysUntil, getSubscriptionStatus, graceEndsAt } from '../utils/subscription';

/**
 * The signed-in vendor's subscription standing, for the dashboard-wide banner. Reloads on every page
 * change so a renewal shows straight away. "Renew" is one tap: it creates the renewal invoice and
 * opens the payment screen.
 */
export function useSubscriptionStanding() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [renewing, setRenewing] = useState(false);
  const load = useCallback(
    () => getSubscription(),
    // pathname is only a trigger: reload whenever the vendor moves to another page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname]
  );
  const { data } = useAsyncData(load);

  async function renew() {
    if (renewing) return;
    setRenewing(true);
    try {
      const invoice = await renewSubscription();
      navigate(DASHBOARD_ROUTES.pay(PAYMENT_SUBJECT.Subscription, invoice.id));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRenewing(false);
    }
  }

  const standing = data ?
  {
    status: getSubscriptionStatus(data.renewsOn),
    daysLeft: daysUntil(data.renewsOn),
    renewsOn: data.renewsOn,
    graceEndsAt: graceEndsAt(data.renewsOn),
    coveredBy: data.coveredBy
  } :
  null;

  return { standing, renew, renewing };
}
