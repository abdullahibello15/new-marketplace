import { ApiError, mockResponse } from '../../../services/mockApi';
import { mockPlanCatalogue, mockSubscription } from '../mock/subscription';
import { nextRenewalDate } from '../utils/subscription';
import type { PlanCatalogue, PlanId, Subscription } from '../types';

let subscription: Subscription = structuredClone(mockSubscription);

function findPlan(planId: PlanId) {
  const plan = mockPlanCatalogue.plans.find((p) => p.id === planId);
  if (!plan) throw new ApiError('That plan doesn’t exist.', 404);
  return plan;
}

/** GET /vendor/subscription */
export function getSubscription(): Promise<Subscription> {
  return mockResponse(() => subscription);
}

/** GET /plans */
export function getPlanCatalogue(): Promise<PlanCatalogue> {
  return mockResponse(() => mockPlanCatalogue);
}

/**
 * POST /vendor/subscription/renew
 * MOCK ONLY: no payment is taken. The real endpoint would start a checkout with the payment
 * provider and update the subscription from its webhook.
 */
export function renewSubscription(): Promise<Subscription> {
  return mockResponse(() => {
    if (findPlan(subscription.planId).monthlyPrice === 0) throw new ApiError('Free plans don’t need renewing.', 400);
    subscription = { ...subscription, renewsOn: nextRenewalDate(subscription.renewsOn).toISOString() };
    return subscription;
  }, 900);
}

/** POST /vendor/subscription/plan { planId }. MOCK ONLY: no payment is taken. */
export function changePlan(planId: PlanId): Promise<Subscription> {
  return mockResponse(() => {
    findPlan(planId);
    if (planId === subscription.planId) throw new ApiError('You’re already on this plan.', 409);
    subscription = { ...subscription, planId };
    return subscription;
  }, 900);
}
