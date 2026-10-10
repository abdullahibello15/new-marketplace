import { getAllVendors } from '../../../services/vendorStore';
import { JOB_ACTOR } from '../../jobs/constants';
import { SUBSCRIPTION_AUDIENCE } from '../../reminders/constants';
import { cancelSubscriptionRemindersNow, scheduleSubscriptionRemindersNow } from '../../reminders/services/reminderService';
import { BUNDLE_RULES } from '../bundles';
import { ASSOCIATION_MEMBER_STATUS, DASHBOARD_ROUTES } from '../constants';
import { BILLING_RULES, planById } from '../plans';
import { findAssociation } from './associationService';
import type { Association, AssociationMember, Subscription } from '../types';

/*
 * Subscription renewal reminders, built on the booking reminder service (same preferences, push/SMS
 * delivery and log). Every schedule is keyed per person, so scheduling again replaces what was pending:
 * renewing stops the old reminders, a plan change re-words them.
 */

export const vendorReminderKey = (vendorId: string) => `vendor:${vendorId}`;
export const memberReminderKey = (associationId: string, vendorId: string) => `assoc:${associationId}:member:${vendorId}`;
export const adminReminderKey = (associationId: string) => `assoc:${associationId}:admin`;

const nameOf = (vendorId: string) => getAllVendors().find((v) => v.id === vendorId)?.name ?? vendorId;

/** A vendor paying for themselves: reminders about their own end date. */
export function scheduleVendorReminders(sub: Pick<Subscription, 'vendorId' | 'planId' | 'renewsOn'>, reason?: string): void {
  scheduleSubscriptionRemindersNow(
    {
      key: vendorReminderKey(sub.vendorId),
      audience: SUBSCRIPTION_AUDIENCE.Vendor,
      recipient: JOB_ACTOR.Vendor,
      recipientId: sub.vendorId,
      vendorName: nameOf(sub.vendorId),
      planName: planById(sub.planId).name,
      renewsOn: sub.renewsOn,
      graceDays: BILLING_RULES.graceDays,
      associationName: null,
      path: DASHBOARD_ROUTES.subscription
    },
    reason
  );
}

/**
 * An association: the admin is reminded about the bundle payment; each covered member about the bundle's
 * renewal date (and their own-plan reminders stop while covered). Members no longer covered lose theirs.
 */
export function scheduleAssociationReminders(associationId: string, reason?: string): void {
  const a = findAssociation(associationId);
  const plan = planById(BUNDLE_RULES.memberPlanId);
  scheduleSubscriptionRemindersNow(
    {
      key: adminReminderKey(a.id),
      audience: SUBSCRIPTION_AUDIENCE.Admin,
      recipient: JOB_ACTOR.Vendor,
      recipientId: a.id,
      vendorName: a.adminName,
      planName: plan.name,
      renewsOn: a.renewsOn,
      graceDays: BILLING_RULES.graceDays,
      associationName: a.name,
      path: DASHBOARD_ROUTES.association
    },
    reason
  );
  for (const m of a.members) {
    if (m.status === ASSOCIATION_MEMBER_STATUS.Active) {
      cancelSubscriptionRemindersNow(vendorReminderKey(m.vendorId), `Covered by ${a.name}`);
      scheduleSubscriptionRemindersNow(
        {
          key: memberReminderKey(a.id, m.vendorId),
          audience: SUBSCRIPTION_AUDIENCE.Member,
          recipient: JOB_ACTOR.Vendor,
          recipientId: m.vendorId,
          vendorName: m.vendorName,
          planName: plan.name,
          renewsOn: a.renewsOn,
          graceDays: BILLING_RULES.graceDays,
          associationName: a.name,
          path: DASHBOARD_ROUTES.subscription
        },
        reason
      );
    } else if (m.status === ASSOCIATION_MEMBER_STATUS.Removed) {
      scheduleRemovedMemberReminders(a, m);
    }
  }
}

/** A removed member keeps access until the paid-up date, then needs their own plan: remind them about that date. */
export function scheduleRemovedMemberReminders(a: Association, m: AssociationMember): void {
  cancelSubscriptionRemindersNow(memberReminderKey(a.id, m.vendorId), `Removed from ${a.name}`);
  if (!m.accessUntil) return;
  scheduleVendorReminders({ vendorId: m.vendorId, planId: BUNDLE_RULES.memberPlanId, renewsOn: m.accessUntil }, `Removed from ${a.name}`);
}
