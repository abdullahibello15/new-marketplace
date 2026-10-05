import { useState } from 'react';
import { format } from 'date-fns';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { changePlan, getPlanCatalogue, getSubscription, renewSubscription } from '../services/subscriptionService';
import { daysUntil, getSubscriptionStatus } from '../utils/subscription';
import type { Subscription, SubscriptionPlan } from '../types';

const loadSubscription = () =>
Promise.all([getSubscription(), getPlanCatalogue()]).then(([subscription, catalogue]) => ({ subscription, catalogue }));

/** What the confirmation dialog is asking about. */
export interface PendingPlanAction {
  kind: 'renew' | 'switch';
  plan: SubscriptionPlan;
}

export function useSubscription() {
  const { data, status, error, reload, setData } = useAsyncData(loadSubscription);
  const toast = useToast();
  const [pending, setPending] = useState<PendingPlanAction | null>(null);
  const [saving, setSaving] = useState(false);

  const subscription = data?.subscription ?? null;
  const catalogue = data?.catalogue ?? null;
  const currentPlan = catalogue?.plans.find((p) => p.id === subscription?.planId) ?? null;
  const subscriptionStatus = subscription ? getSubscriptionStatus(subscription.renewsOn) : null;
  const daysLeft = subscription ? daysUntil(subscription.renewsOn) : 0;

  const store = (next: Subscription) => setData((prev) => ({ ...prev, subscription: next }));

  async function confirm() {
    if (!pending) return;
    setSaving(true);
    try {
      if (pending.kind === 'renew') {
        const next = await renewSubscription();
        store(next);
        toast.success(`Renewed. ${pending.plan.name} now runs until ${format(new Date(next.renewsOn), 'd MMM yyyy')}.`);
      } else {
        store(await changePlan(pending.plan.id));
        toast.success(`You’re now on ${pending.plan.name}.`);
      }
      setPending(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return {
    status,
    error,
    reload,
    subscription,
    catalogue,
    currentPlan,
    subscriptionStatus,
    daysLeft,
    pending,
    saving,
    requestRenew: () => currentPlan && setPending({ kind: 'renew', plan: currentPlan }),
    requestSwitch: (plan: SubscriptionPlan) => setPending({ kind: 'switch', plan }),
    cancel: () => setPending(null),
    confirm
  };
}
