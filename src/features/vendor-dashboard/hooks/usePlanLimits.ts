import { useAsyncData } from '../../../hooks/useAsyncData';
import { planById } from '../plans';
import { getSubscription } from '../services/subscriptionService';
import type { PlanLimitKey } from '../types';

/**
 * The signed-in vendor's plan limits (from plans.ts). `limitOf` is null when the plan has no limit, or
 * while it loads, so nothing is blocked before we know the plan; the server re-checks on save.
 */
export function usePlanLimits() {
  const { data } = useAsyncData(getSubscription);
  const plan = data ? planById(data.planId) : null;
  const limitOf = (key: PlanLimitKey): number | null => plan?.limits[key] ?? null;
  /** True once `count` has reached the plan's limit for `key`. */
  const reached = (key: PlanLimitKey, count: number): boolean => {
    const limit = limitOf(key);
    return limit !== null && count >= limit;
  };
  return { plan, limitOf, reached };
}
