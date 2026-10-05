import { daysFromNow } from './time';
import type { PlanCatalogue, Subscription } from '../types';

/** Renews in 5 days, so the "expiring soon" warning shows by default. */
export const mockSubscription: Subscription = {
  planId: 'trade',
  renewsOn: daysFromNow(5, 23, 59),
  startedAt: daysFromNow(-120, 10)
};

export const mockPlanCatalogue: PlanCatalogue = {
  plans: [
  { id: 'starter', name: 'Starter', monthlyPrice: 0, tagline: 'Get listed and take your first jobs.' },
  { id: 'trade', name: 'Trade tier', monthlyPrice: 2500, tagline: 'For working tradespeople with regular customers.' },
  { id: 'pro', name: 'Pro', monthlyPrice: 6000, tagline: 'Grow faster with priority placement and full reports.' }],

  features: [
  { label: 'Public profile', values: { starter: true, trade: true, pro: true } },
  { label: 'Job requests per month', values: { starter: '10', trade: 'Unlimited', pro: 'Unlimited' } },
  { label: 'Product listings', values: { starter: '5', trade: '50', pro: 'Unlimited' } },
  { label: 'Calendar & bookings', values: { starter: true, trade: true, pro: true } },
  { label: 'Verified trade badge', values: { starter: false, trade: true, pro: true } },
  { label: 'Priority in search results', values: { starter: false, trade: false, pro: true } },
  { label: 'Earnings reports', values: { starter: 'Basic', trade: 'Full', pro: 'Full + export' } },
  { label: 'Support', values: { starter: 'Email', trade: 'Phone', pro: 'Dedicated manager' } }]

};
