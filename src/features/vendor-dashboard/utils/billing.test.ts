import { describe, expect, it } from 'vitest';
import { INVOICE_KIND, PLAN_ID, SUBSCRIPTION_STATUS } from '../constants';
import { BILLING_RULES, PLANS, planAllowingMore } from '../plans';
import { changeKind, prorateUpgrade, quoteChange } from './billing';
import { getSubscriptionStatus, isProfileLimited } from './subscription';
import type { Subscription } from '../types';

// Local times so day counting doesn't depend on the test machine's time zone.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const endOf = (y: number, m: number, d: number) => new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  vendorId: 'v1',
  planId: PLAN_ID.Standard,
  periodStart: at(2026, 10, 1, 0).toISOString(),
  renewsOn: endOf(2026, 10, 30),
  startedAt: at(2026, 1, 1).toISOString(),
  scheduledChange: null,
  ...over
});

describe('plan config', () => {
  it('has the agreed monthly prices', () => {
    expect(PLANS.map((p) => [p.id, p.price, p.billingPeriod])).toEqual([
    ['starter', 2000, 'monthly'],
    ['standard', 7000, 'monthly'],
    ['premium', 15000, 'monthly']]);

  });

  it('finds the cheapest plan that lifts a limit', () => {
    const starter = PLANS[0].limits.products ?? 0;
    expect(planAllowingMore('products', starter)?.id).toBe(PLAN_ID.Standard);
    expect(planAllowingMore('products', 10_000)?.id).toBe(PLAN_ID.Premium);
  });
});

describe('upgrade proration', () => {
  it('charges the new plan for the days left, minus credit for the old plan', () => {
    // 30-day period, upgrading on day 21 (10 days left counting today).
    const p = prorateUpgrade(7000, 15000, at(2026, 10, 1, 0).toISOString(), endOf(2026, 10, 30), at(2026, 10, 21));
    expect(p).toEqual({ remainingDays: 10, totalDays: 30, months: 1, credit: 2333, charge: 5000, due: 2667 });
  });

  it('after renewing early, credits what was paid for every prepaid month (not one month spread thin)', () => {
    // Two months paid (Oct + Nov, 61 days), upgrading with 31 days left: about one month's difference.
    const p = prorateUpgrade(7000, 15000, at(2026, 10, 1, 0).toISOString(), endOf(2026, 11, 30), at(2026, 10, 31));
    expect(p).toMatchObject({ months: 2, remainingDays: 31, totalDays: 61, credit: 7115, charge: 15246, due: 8131 });
  });

  it('on the first day it costs the full difference', () => {
    const p = prorateUpgrade(2000, 7000, at(2026, 10, 1, 0).toISOString(), endOf(2026, 10, 30), at(2026, 10, 1));
    expect(p.due).toBe(5000);
  });

  it('on the last day only one day is charged', () => {
    const p = prorateUpgrade(7000, 15000, at(2026, 10, 1, 0).toISOString(), endOf(2026, 10, 30), at(2026, 10, 30));
    expect(p).toMatchObject({ remainingDays: 1, due: Math.round(15000 / 30) - Math.round(7000 / 30) });
  });

  it('the quote shows the working and takes effect now, keeping the end date', () => {
    const now = at(2026, 10, 21);
    const q = quoteChange(sub(), PLAN_ID.Premium, now);
    expect(q.kind).toBe(INVOICE_KIND.Upgrade);
    expect(q.amount).toBe(2667);
    expect(q.lines.map((l) => l.amount)).toEqual([5000, -2333]);
    expect(q.lines.reduce((s, l) => s + l.amount, 0)).toBe(q.amount);
    expect(q.periodEnd).toBe(sub().renewsOn);
    expect(q.effectiveAt).toBe(now.toISOString());
  });
});

describe('downgrade, renewal and subscribe', () => {
  it('a downgrade is charged for the next period and takes effect when the current one ends', () => {
    const q = quoteChange(sub(), PLAN_ID.Starter, at(2026, 10, 21));
    expect(q.kind).toBe(INVOICE_KIND.Downgrade);
    expect(q.amount).toBe(2000);
    expect(new Date(q.effectiveAt)).toEqual(at(2026, 10, 31, 0));
    expect(new Date(q.effectiveAt) > new Date(sub().renewsOn)).toBe(true);
  });

  it('renewing early adds a month after the current end date', () => {
    const q = quoteChange(sub(), PLAN_ID.Standard, at(2026, 10, 25));
    expect(q.kind).toBe(INVOICE_KIND.Renew);
    expect(q.amount).toBe(7000);
    expect(new Date(q.periodStart)).toEqual(at(2026, 10, 31, 0));
    expect(new Date(q.periodEnd).getMonth()).toBe(10); // November
  });

  it('after the grace period, any plan is a fresh subscription starting today', () => {
    const now = at(2026, 11, 10);
    expect(changeKind(sub(), PLAN_ID.Standard, now)).toBe(INVOICE_KIND.Subscribe);
    const q = quoteChange(sub(), PLAN_ID.Premium, now);
    expect(q).toMatchObject({ kind: INVOICE_KIND.Subscribe, amount: 15000, effectiveAt: now.toISOString() });
  });

  it('an upgrade during the grace period is charged as a full month on the new plan, starting now', () => {
    const now = at(2026, 11, 1);
    const q = quoteChange(sub(), PLAN_ID.Premium, now);
    expect(q).toMatchObject({ kind: INVOICE_KIND.Upgrade, amount: 15000, effectiveAt: now.toISOString() });
  });
});

describe('expiry and grace', () => {
  it(`warns, then gives ${BILLING_RULES.graceDays} days of grace, then limits the profile`, () => {
    const s = sub();
    expect(getSubscriptionStatus(s.renewsOn, at(2026, 10, 10))).toBe(SUBSCRIPTION_STATUS.Active);
    expect(getSubscriptionStatus(s.renewsOn, at(2026, 10, 25))).toBe(SUBSCRIPTION_STATUS.ExpiringSoon);
    expect(getSubscriptionStatus(s.renewsOn, at(2026, 10, 31))).toBe(SUBSCRIPTION_STATUS.Grace);
    expect(getSubscriptionStatus(s.renewsOn, at(2026, 11, 2, 23))).toBe(SUBSCRIPTION_STATUS.Grace);
    expect(isProfileLimited(s.renewsOn, at(2026, 11, 2, 23))).toBe(false);
    expect(getSubscriptionStatus(s.renewsOn, at(2026, 11, 3))).toBe(SUBSCRIPTION_STATUS.Expired);
    expect(isProfileLimited(s.renewsOn, at(2026, 11, 3))).toBe(true);
  });
});
