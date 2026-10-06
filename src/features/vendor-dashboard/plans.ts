import { PORTFOLIO_MAX, SERVICES_MAX } from '../vendor-profile/constants';
import { BILLING_PERIOD, PLAN_ID, PLAN_LIMIT } from './constants';
import type { PlanFeature, PlanId, PlanLimitKey, SubscriptionPlan } from './types';

/*
 * Vendor subscription plans and billing rules: the one place to change prices, periods and limits.
 *
 * ⚠️ PLACEHOLDER: the feature list and limit numbers below are NOT from the product build spec (it
 * wasn't provided). Prices are confirmed. Replace every value marked PLACEHOLDER with the spec.
 */

export const BILLING_RULES = {
  /** Days after the end date before the profile is limited (hidden from search, no new requests). */
  graceDays: 3,
  /** Show the "ends soon" warning when this many days or fewer remain. */
  expiryWarningDays: 7,
  /** MOCK: show the demo controls that move the subscription's dates (to try expiry and grace). False in production. */
  showDemoControls: true
} as const;

export const PLANS: readonly SubscriptionPlan[] = [
{
  id: PLAN_ID.Starter,
  name: 'Starter',
  price: 2000,
  billingPeriod: BILLING_PERIOD.Monthly,
  tagline: 'Get listed and take your first jobs.', // PLACEHOLDER copy
  limits: { portfolioPhotos: 3, products: 10, services: 3 } // PLACEHOLDER limits
},
{
  id: PLAN_ID.Standard,
  name: 'Standard',
  price: 7000,
  billingPeriod: BILLING_PERIOD.Monthly,
  tagline: 'For working tradespeople with regular customers.', // PLACEHOLDER copy
  limits: { portfolioPhotos: 6, products: 50, services: 10 } // PLACEHOLDER limits
},
{
  id: PLAN_ID.Premium,
  name: 'Premium',
  price: 15000,
  billingPeriod: BILLING_PERIOD.Monthly,
  tagline: 'Grow faster with priority placement and full reports.', // PLACEHOLDER copy
  // No plan limit on products; photos and services stop at the app's own maximums.
  limits: { portfolioPhotos: PORTFOLIO_MAX, products: null, services: SERVICES_MAX } // PLACEHOLDER limits
}];


/** Words for each limit, for the comparison table and upgrade prompts. */
export const PLAN_LIMIT_LABELS: Record<PlanLimitKey, {label: string;one: string;many: string;}> = {
  portfolioPhotos: { label: 'Portfolio photos', one: 'portfolio photo', many: 'portfolio photos' },
  products: { label: 'Product listings', one: 'product', many: 'products' },
  services: { label: 'Services listed', one: 'service', many: 'services' }
};

const limitText = (n: number | null) => n === null ? 'Unlimited' : String(n);

/** Comparison rows: the enforced limits first (from PLANS, so they can't disagree), then the other features. */
export const PLAN_FEATURES: readonly PlanFeature[] = [
...Object.values(PLAN_LIMIT).map((key): PlanFeature => ({
  label: PLAN_LIMIT_LABELS[key].label,
  values: Object.fromEntries(PLANS.map((p) => [p.id, limitText(p.limits[key])])) as Record<PlanId, string>
})),
// PLACEHOLDER rows: replace with the features from the build spec.
{ label: 'Public profile & search listing', values: { starter: true, standard: true, premium: true } },
{ label: 'Verified trade badge', values: { starter: false, standard: true, premium: true } },
{ label: 'Priority in search results', values: { starter: false, standard: false, premium: true } },
{ label: 'Earnings reports', values: { starter: 'Basic', standard: 'Full', premium: 'Full + export' } },
{ label: 'Support', values: { starter: 'Email', standard: 'Phone', premium: 'Dedicated manager' } }];


export function planById(id: PlanId): SubscriptionPlan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan ${id}`);
  return plan;
}

/** The cheapest plan that allows more than `count` of something, for upgrade prompts. */
export function planAllowingMore(key: PlanLimitKey, count: number): SubscriptionPlan | null {
  return [...PLANS].sort((a, b) => a.price - b.price).find((p) => p.limits[key] === null || (p.limits[key] ?? 0) > count) ?? null;
}
