import { differenceInCalendarDays } from 'date-fns';
import i18n from '../../../i18n';
import { formatNaira } from '../../../utils/format';
import { BUNDLE_RULES } from '../bundles';
import type { InvoiceLine } from '../types';

/*
 * Association bundle pricing. Pure: no state, no clock reads. Tested in bundle.test.ts.
 */

/** The discount tier for this many members (0% below the first tier). */
export function discountPercentFor(memberCount: number): number {
  return [...BUNDLE_RULES.discountTiers].reverse().find((t) => memberCount >= t.minMembers)?.percentOff ?? 0;
}

export interface BundleQuote {
  /** One line per member, then the discount line (negative). */
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  percentOff: number;
  total: number;
}

/** A full period for every member: member lines at the plan price, then the tier discount on the subtotal. */
export function quoteBundle(memberNames: readonly string[], planPrice: number, planName: string): BundleQuote {
  const percentOff = discountPercentFor(memberNames.length);
  const subtotal = planPrice * memberNames.length;
  const discount = Math.round(subtotal * percentOff / 100);
  return {
    lines: [
    ...memberNames.map((name) => ({ label: i18n.t('vendor:association.line.member', { name, plan: planName }), amount: planPrice })),
    ...(discount ? [{ label: i18n.t('vendor:association.line.discount', { percent: percentOff, count: memberNames.length }), amount: -discount }] : [])],

    subtotal,
    discount,
    percentOff,
    total: subtotal - discount
  };
}

/**
 * Adding members mid-period: each pays the plan price for the days left in the bundle's period (today
 * counts), with the discount tier the bundle reaches once they're in. Rounded per member to whole Naira.
 */
export function quoteMemberAdditions(
newNames: readonly string[],
membersAfter: number,
planPrice: number,
periodStart: string,
periodEnd: string,
now: Date)
: BundleQuote & {remainingDays: number;totalDays: number;} {
  const totalDays = Math.max(1, differenceInCalendarDays(new Date(periodEnd), new Date(periodStart)) + 1);
  const remainingDays = Math.min(totalDays, Math.max(0, differenceInCalendarDays(new Date(periodEnd), now) + 1));
  const prorated = Math.round(planPrice * remainingDays / totalDays);
  const percentOff = discountPercentFor(membersAfter);
  const subtotal = prorated * newNames.length;
  const discount = Math.round(subtotal * percentOff / 100);
  return {
    lines: [
    ...newNames.map((name) => ({ label: i18n.t('vendor:association.line.prorated', { name, price: formatNaira(planPrice), left: remainingDays, total: totalDays }), amount: prorated })),
    ...(discount ? [{ label: i18n.t('vendor:association.line.discountAfter', { percent: percentOff, count: membersAfter }), amount: -discount }] : [])],

    subtotal,
    discount,
    percentOff,
    total: subtotal - discount,
    remainingDays,
    totalDays
  };
}
