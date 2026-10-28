import { PLAN_ID } from './constants';
import type { PlanId } from './types';

/*
 * Trade association bundle billing: the one place to change bundle rules.
 *
 * ⚠️ PLACEHOLDER: every value below is a placeholder and must be confirmed against the build spec
 * (it wasn't provided): the member plan, the member limits and the discount tiers.
 */
export const BUNDLE_RULES = {
  /** The plan every covered member gets. PLACEHOLDER */
  memberPlanId: PLAN_ID.Standard as PlanId,
  /** Fewest members a bundle can be paid for. PLACEHOLDER */
  minMembers: 3,
  /** Most members one bundle can cover. PLACEHOLDER */
  maxMembers: 50,
  /**
   * Discount by member count: the highest tier the bundle reaches applies to every member. PLACEHOLDER
   * Ordered by minMembers, ascending.
   */
  discountTiers: [
  { minMembers: 3, percentOff: 10 },
  { minMembers: 10, percentOff: 15 },
  { minMembers: 25, percentOff: 20 }] as
  readonly {minMembers: number;percentOff: number;}[]
} as const;
