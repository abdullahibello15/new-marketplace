import { mockResponse } from '../../../services/mockApi';
import { BUNDLE_RULES } from '../bundles';
import { ASSOCIATION_MEMBER_STATUS } from '../constants';
import { planById } from '../plans';
import { getSubscriptionStatus, graceEndsAt } from '../utils/subscription';
import { addMemberNow, billableMembers, countedMembers, findAssociation, removeMemberNow } from './associationService';
import { quoteAssociationBilling } from './subscriptionService';
import { scheduleRemovedMemberReminders } from './subscriptionReminders';
import type { Association, AssociationMember, InvoiceQuote, SubscriptionPlan, SubscriptionStatus } from '../types';

/*
 * The association admin screen's API (mocked). Member changes are stored by associationService; what
 * they cost and what payment activates is subscriptionService. Paying goes through the shared payment
 * screen like every other subscription invoice (createBundleInvoice + the pay route).
 */

export interface AssociationOverview {
  association: Association;
  plan: SubscriptionPlan;
  /** The bundle's own standing, from the same status helper as vendors. */
  status: SubscriptionStatus;
  graceEndsAt: string;
  coveredCount: number;
  countedCount: number;
  renewal: {quote: InvoiceQuote | null;blockedReason: string | null;};
  additions: {quote: InvoiceQuote | null;blockedReason: string | null;};
}

/** GET /associations/:id — members, bundle standing, and what the renewal and any new members cost. */
export function getAssociationOverview(associationId: string): Promise<AssociationOverview> {
  return mockResponse(() => {
    const association = findAssociation(associationId);
    const billing = quoteAssociationBilling(associationId);
    return {
      association,
      plan: planById(BUNDLE_RULES.memberPlanId),
      status: getSubscriptionStatus(association.renewsOn),
      graceEndsAt: graceEndsAt(association.renewsOn).toISOString(),
      coveredCount: billableMembers(association).length,
      countedCount: countedMembers(association).length,
      renewal: billing.renewal,
      additions: billing.additions
    };
  });
}

/** POST /associations/:id/members { contact } — by phone or email. They're covered once the prorated amount is paid. */
export function addAssociationMember(associationId: string, contact: string): Promise<AssociationMember> {
  return mockResponse(() => addMemberNow(associationId, contact, new Date()), 500);
}

/**
 * DELETE /associations/:id/members/:memberId — no refund. A covered member keeps access until the end
 * of the period already paid; their reminders switch to "your access ends on…".
 */
export function removeAssociationMember(associationId: string, memberId: string): Promise<AssociationMember> {
  return mockResponse(() => {
    const removed = removeMemberNow(associationId, memberId, new Date());
    if (removed.accessUntil && removed.status === ASSOCIATION_MEMBER_STATUS.Removed) {
      scheduleRemovedMemberReminders(findAssociation(associationId), removed);
    }
    return removed;
  }, 500);
}
