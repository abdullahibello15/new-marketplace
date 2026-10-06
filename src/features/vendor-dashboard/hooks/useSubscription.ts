import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { PAYMENT_SUBJECT } from '../../payments/constants';
import { DASHBOARD_ROUTES } from '../constants';
import {
  changePlan,
  getPlanCatalogue,
  getSubscription,
  quotePlanChange,
  renewSubscription,
  simulateSubscriptionState,
  type DemoSubscriptionState } from
'../services/subscriptionService';
import { daysUntil, getSubscriptionStatus, graceEndsAt } from '../utils/subscription';
import type { InvoiceQuote, SubscriptionPlan } from '../types';

const loadSubscription = () =>
Promise.all([getSubscription(), getPlanCatalogue()]).then(([subscription, catalogue]) => ({ subscription, catalogue }));

/** What the confirmation dialog is asking about, with the server's price quote once it arrives. */
export interface PendingPlanAction {
  kind: 'renew' | 'switch';
  plan: SubscriptionPlan;
  /** Null while the quote loads. */
  quote: InvoiceQuote | null;
}

/**
 * Subscription page state. Renewals and plan changes are paid on the shared payment screen: the dialog
 * shows the quote (with the proration working for upgrades), then an invoice is created and the vendor
 * is taken to pay it. The subscription only changes once that payment is verified.
 */
export function useSubscription() {
  const { data, status, error, reload, setData } = useAsyncData(loadSubscription);
  const toast = useToast();
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingPlanAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const subscription = data?.subscription ?? null;
  const catalogue = data?.catalogue ?? null;
  const currentPlan = catalogue?.plans.find((p) => p.id === subscription?.planId) ?? null;
  const scheduledPlan = catalogue?.plans.find((p) => p.id === subscription?.scheduledChange?.planId) ?? null;
  const subscriptionStatus = subscription ? getSubscriptionStatus(subscription.renewsOn) : null;
  const daysLeft = subscription ? daysUntil(subscription.renewsOn) : 0;
  const graceEnds = subscription ? graceEndsAt(subscription.renewsOn) : null;

  async function ask(kind: PendingPlanAction['kind'], plan: SubscriptionPlan) {
    setPending({ kind, plan, quote: null });
    try {
      const quote = await quotePlanChange(plan.id);
      setPending((p) => p && p.plan.id === plan.id ? { ...p, quote } : p);
    } catch (e) {
      toast.error(errorMessage(e));
      setPending(null);
    }
  }

  /** Creates the invoice (amount recalculated by the server) and opens the payment screen. */
  async function confirm() {
    if (!pending?.quote || saving) return;
    setSaving(true);
    try {
      const invoice = pending.kind === 'renew' ? await renewSubscription() : await changePlan(pending.plan.id);
      setPending(null);
      navigate(DASHBOARD_ROUTES.pay(PAYMENT_SUBJECT.Subscription, invoice.id));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  /** MOCK: move the subscription's dates to try the warning, grace and limited states. */
  async function simulate(state: DemoSubscriptionState) {
    setSimulating(true);
    try {
      const next = await simulateSubscriptionState(state);
      setData((prev) => ({ ...prev, subscription: next }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSimulating(false);
    }
  }

  return {
    status,
    error,
    reload,
    subscription,
    catalogue,
    currentPlan,
    scheduledPlan,
    subscriptionStatus,
    daysLeft,
    graceEnds,
    pending,
    saving,
    simulating,
    requestRenew: () => currentPlan && void ask('renew', currentPlan),
    requestSwitch: (plan: SubscriptionPlan) => void ask(plan.id === currentPlan?.id ? 'renew' : 'switch', plan),
    cancel: () => setPending(null),
    confirm,
    simulate
  };
}
