import { subDays, subMonths } from 'date-fns';
import type { ChurnReasonFact } from '../analytics/types';

/*
 * MOCK answers from the "cancel subscription" dialog and the short exit survey sent to vendors who left
 * or lapsed. Not every churned vendor answered. Dates are relative to today, matching when each left
 * (data/formerVendors.ts) or lapsed (the subscription gaps in vendor-dashboard/mock/subscription.ts).
 */
const monthsAgo = (m: number, plusDays = 0) => subDays(subMonths(new Date(), m), -plusDays).toISOString();

export const mockChurnReasons: ChurnReasonFact[] = [
{ vendorId: 'former-lapai-welders', reason: 'not_enough_jobs', comment: 'Very few requests from Lapai. Most of my customers still call me directly.', at: monthsAgo(9, 3), source: 'exit_survey' },
{ vendorId: 'former-mokwa-mechanics', reason: 'moved_away', comment: 'Relocated the workshop to Ilorin.', at: monthsAgo(6, 2), source: 'cancel_dialog' },
{ vendorId: 'former-tafa-tailors', reason: 'too_expensive', comment: 'Starter plan is too much in the rainy season when work is slow.', at: monthsAgo(4, 1), source: 'cancel_dialog' },
{ vendorId: 'former-minna-fresh', reason: 'using_other_platform', comment: 'We sell mostly through our WhatsApp group now.', at: monthsAgo(5, 4), source: 'exit_survey' },
{ vendorId: 'former-bosso-sparks', reason: 'not_enough_jobs', comment: 'Only two jobs in three months.', at: monthsAgo(8, 1), source: 'cancel_dialog' },
{ vendorId: 'former-tunga-tailors', reason: 'too_expensive', comment: '', at: monthsAgo(6, 2), source: 'cancel_dialog' },
{ vendorId: 'former-kpakungu-paints', reason: 'payment_problems', comment: 'Payouts took too long during a big job; I needed the money for paint.', at: monthsAgo(3, 3), source: 'exit_survey' },
{ vendorId: 'former-suleja-riders', reason: 'closed_business', comment: 'My bike was stolen. Will come back when I buy another.', at: monthsAgo(7, 1), source: 'exit_survey' },
{ vendorId: 'former-chanchaga-plumbing', reason: 'not_enough_jobs', comment: 'Too many plumbers in Chanchaga on the app.', at: monthsAgo(4, 2), source: 'cancel_dialog' },
{ vendorId: 'former-maitumbi-braids', reason: 'too_expensive', comment: '', at: monthsAgo(3, 1), source: 'cancel_dialog' },
{ vendorId: 'former-paikoro-grains', reason: 'using_other_platform', comment: 'Customers prefer to pay cash at the market.', at: monthsAgo(2, 2), source: 'exit_survey' },
{ vendorId: 'former-kontagora-woodworks', reason: 'closed_business', comment: 'Taking a break for the farming season.', at: monthsAgo(2, 1), source: 'cancel_dialog' },
{ vendorId: 'former-gidan-kwano-fix', reason: 'not_enough_jobs', comment: '', at: monthsAgo(1, 2), source: 'cancel_dialog' },
{ vendorId: 'former-lapai-tailoring', reason: 'other', comment: 'Didn’t understand how quotes work. Would try again with training.', at: monthsAgo(1, 1), source: 'exit_survey' },
// Lapsed and later came back (win-backs).
{ vendorId: 'zainab-dispatch', reason: 'too_expensive', comment: 'Couldn’t pay for two months. Back now that business has picked up.', at: monthsAgo(9, 5), source: 'exit_survey' },
{ vendorId: 'paiko-cool-electrical', reason: 'payment_problems', comment: 'My card kept failing; renewed later by transfer.', at: monthsAgo(4, 5), source: 'cancel_dialog' }];
