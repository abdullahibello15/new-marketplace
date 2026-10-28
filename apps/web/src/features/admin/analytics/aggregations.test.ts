import { describe, expect, it } from 'vitest';
import {
  activeByCategory,
  activeByLga,
  activeVendorIds,
  bucketSizeFor,
  bucketsFor,
  categoryLgaMatrix,
  changePct,
  churn,
  commissionIn,
  coverByVendor,
  expiringWithin,
  funnel,
  gmvBy,
  gmvSeries,
  gmvSummary,
  gmvValue,
  mrrAt,
  planChanges,
  planMix,
  previousRange,
  projectNextMonth,
  renewalRate,
  resolveRange,
  revenueByLine,
  revenueSeries,
  statusAt,
  subscriberMovements,
  vendorSummary,
  workRates } from
'./aggregations';
import type { CoverageFact, DateRange, RevenueFact, VendorFact, WorkFact } from './types';

const NOW = new Date(2026, 9, 8, 12); // 8 Oct 2026, noon
const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h).toISOString();
const range = (from: string, to: string): DateRange => ({ start: new Date(`${from}T00:00:00`), end: new Date(`${to}T23:59:59.999`) });
const SEPT = range('2026-09-01', '2026-09-30');
const AUG = range('2026-08-01', '2026-08-31');

let n = 0;
function work(over: Partial<WorkFact>): WorkFact {
  n += 1;
  return {
    id: `w${n}`,
    kind: 'service',
    vendorId: 'v1',
    category: 'plumber',
    lga: 'Chanchaga',
    requestedAt: d(2026, 9, 2),
    quotedAt: d(2026, 9, 2, 15),
    acceptedAt: d(2026, 9, 3),
    completedAt: d(2026, 9, 5),
    cancelledAt: null,
    disputedAt: null,
    value: 10_000,
    paidVia: 'escrow',
    ...over
  };
}

const vendor = (id: string, over: Partial<VendorFact> = {}): VendorFact => ({
  id,
  name: id,
  kind: 'service',
  category: 'plumber',
  serviceAreas: ['Chanchaga'],
  verification: 'id',
  joinedAt: d(2025, 1, 1),
  leftAt: null,
  current: true,
  ...over
});

const cover = (vendorId: string, start: string, end: string, over: Partial<CoverageFact> = {}): CoverageFact => ({
  vendorId,
  start,
  end,
  monthlyValue: 7_000,
  planId: 'standard',
  viaBundle: false,
  ...over
});

describe('ranges and buckets', () => {
  it('resolves presets ending today, and the previous period of the same length', () => {
    const r = resolveRange('7d', '', '', NOW);
    expect(r.start).toEqual(new Date(2026, 9, 2));
    expect(r.end).toEqual(new Date(2026, 9, 8, 23, 59, 59, 999));
    const p = previousRange(r);
    expect(p.end.getTime()).toBe(r.start.getTime() - 1);
    expect(p.end.getTime() - p.start.getTime()).toBe(r.end.getTime() - r.start.getTime());
    expect(resolveRange('12m', '', '', NOW).start).toEqual(new Date(2025, 9, 9));
  });

  it('uses a valid custom range (clamped to today) and falls back to 30 days otherwise', () => {
    expect(resolveRange('custom', '2026-09-01', '2026-12-31', NOW)).toEqual({ start: new Date(2026, 8, 1), end: new Date(2026, 9, 8, 23, 59, 59, 999) });
    expect(resolveRange('custom', '2026-09-10', '2026-09-01', NOW).start).toEqual(new Date(2026, 8, 9));
  });

  it('picks daily, weekly or monthly buckets from the length', () => {
    expect(bucketSizeFor(resolveRange('30d', '', '', NOW))).toBe('day');
    expect(bucketSizeFor(resolveRange('90d', '', '', NOW))).toBe('week');
    expect(bucketSizeFor(resolveRange('12m', '', '', NOW))).toBe('month');
    const days = bucketsFor(resolveRange('7d', '', '', NOW));
    expect(days).toHaveLength(7);
    const months = bucketsFor(resolveRange('12m', '', '', NOW));
    expect(months).toHaveLength(13);
    // Buckets are clipped to the range.
    expect(months[0].start).toEqual(new Date(2025, 9, 9));
  });

  it('computes % change, and refuses to divide by zero', () => {
    expect(changePct(150, 100)).toBe(50);
    expect(changePct(50, 100)).toBe(-50);
    expect(changePct(0, 0)).toBe(0);
    expect(changePct(10, 0)).toBeNull();
    expect(changePct(10, null)).toBeNull();
  });
});

describe('GMV-equivalent', () => {
  const facts = [
  work({ value: 10_000 }),
  work({ kind: 'retail', category: 'grocer', quotedAt: null, value: 4_000, paidVia: 'cash', lga: 'Bosso' }),
  work({ completedAt: null, cancelledAt: d(2026, 9, 4), value: 50_000 }),
  work({ completedAt: null, disputedAt: d(2026, 9, 6), value: 8_000 }),
  work({ requestedAt: d(2026, 8, 15), quotedAt: d(2026, 8, 16), acceptedAt: d(2026, 8, 17), completedAt: d(2026, 8, 20), value: 99_000 })];


  it('counts only completed work, on the completion date', () => {
    expect(gmvValue({ completedAt: null, value: 500 })).toBe(0);
    expect(gmvValue({ completedAt: d(2026, 9, 1), value: 500 })).toBe(500);
    expect(gmvSummary(facts, SEPT)).toEqual({ gmv: 14_000, jobs: 1, orders: 1, average: 7_000 });
    expect(gmvSummary(facts, AUG).gmv).toBe(99_000);
  });

  it('splits by services and retail per bucket, and groups by any key', () => {
    const series = gmvSeries(facts, bucketsFor(SEPT, 'week'));
    expect(series.reduce((s, b) => s + b.total, 0)).toBe(14_000);
    expect(series.reduce((s, b) => s + b.retail, 0)).toBe(4_000);
    expect(gmvBy(facts, SEPT, (w) => w.lga)).toEqual([
    { key: 'Chanchaga', gmv: 10_000, count: 1 },
    { key: 'Bosso', gmv: 4_000, count: 1 }]
    );
  });

  it('works out cancellation and dispute rates and the escrow/cash split', () => {
    const r = workRates(facts, SEPT);
    expect(r).toMatchObject({ accepted: 4, cancelled: 1, disputed: 1, completed: 2, cancellationRate: 25, disputeRate: 33.3 });
    expect(r.escrowShare).toBe(71.4);
    expect(r.cashShare).toBe(28.6);
  });

  it('builds the funnel from the requests made in the period', () => {
    const f = funnel(
      [
      work({}),
      work({ completedAt: null }),
      work({ acceptedAt: null, completedAt: null }),
      work({ quotedAt: null, acceptedAt: null, completedAt: null }),
      work({ kind: 'retail', quotedAt: null })],

      SEPT
    );
    expect(f.map((s) => s.count)).toEqual([4, 3, 2, 1]);
    expect(f.map((s) => s.dropOff)).toEqual([0, 25, 33.3, 50]);
    expect(f[3].ofRequests).toBe(25);
  });
});

describe('vendors', () => {
  const vendors = [
  vendor('v1'),
  vendor('v2', { category: 'electrician', serviceAreas: ['Bosso', 'Chanchaga'], verification: 'unverified' }),
  vendor('v3', { joinedAt: d(2026, 9, 10) }),
  vendor('v4')];

  const covers = coverByVendor([
  cover('v1', d(2026, 9, 1), d(2026, 10, 30)),
  cover('v2', d(2026, 9, 1), d(2026, 10, 30)),
  cover('v3', d(2026, 9, 10), d(2026, 10, 30)),
  // v4 lapsed: ended 10 Sept, grace over 17 Sept.
  cover('v4', d(2026, 8, 10), d(2026, 9, 10))]
  );
  const facts = [work({ vendorId: 'v1' }), work({ vendorId: 'v2', category: 'electrician' }), work({ vendorId: 'v4' })];

  it('reads subscription status from cover with the app’s status rules', () => {
    expect(statusAt((covers.get('v4') ?? []), new Date(2026, 8, 12))).toBe('grace');
    expect(statusAt((covers.get('v4') ?? []), new Date(2026, 8, 30))).toBe('suspended');
    expect(statusAt((covers.get('v1') ?? []), new Date(2026, 7, 1))).toBe('none');
  });

  it('needs completed work and a non-suspended subscription to be active', () => {
    const active = activeVendorIds(vendors, facts, covers, SEPT, [], NOW);
    expect([...active].sort()).toEqual(['v1', 'v2']);
    // Suspended by Gwani right now: only affects periods ending today.
    const today = resolveRange('30d', '', '', NOW);
    expect(activeVendorIds(vendors, [work({ vendorId: 'v1', completedAt: d(2026, 10, 1) })], covers, today, ['v1'], NOW).size).toBe(0);
    expect(activeVendorIds(vendors, facts, covers, SEPT, [], NOW, { minCompletedInPeriod: 1, excludeSuspended: false }).size).toBe(3);
  });

  it('summarises active, new, suspended and the verified share', () => {
    const active = activeVendorIds(vendors, facts, covers, SEPT, [], NOW);
    expect(vendorSummary(vendors, active, covers, SEPT, [], NOW)).toEqual({ active: 2, newVendors: 1, suspended: 1, verifiedShare: 50 });
  });

  it('counts by category, by LGA served (zeros kept) and as a category × LGA matrix', () => {
    const active = activeVendorIds(vendors, facts, covers, SEPT, [], NOW);
    expect(activeByCategory(vendors, active, ['plumber', 'electrician', 'tailor'])).toEqual([
    { category: 'plumber', count: 1 },
    { category: 'electrician', count: 1 },
    { category: 'tailor', count: 0 }]
    );
    expect(activeByLga(vendors, active, ['Chanchaga', 'Bosso', 'Agaie'])).toEqual([
    { lga: 'Chanchaga', count: 2 },
    { lga: 'Bosso', count: 1 },
    { lga: 'Agaie', count: 0 }]
    );
    const matrix = categoryLgaMatrix(vendors, active, ['electrician'], ['Chanchaga', 'Agaie']);
    expect(matrix[0].cells).toEqual([{ lga: 'Chanchaga', count: 1 }, { lga: 'Agaie', count: 0 }]);
  });
});

describe('subscriptions', () => {
  const covers = coverByVendor([
  // a: Standard, renewed every month.
  cover('a', d(2026, 7, 1), d(2026, 7, 31)),
  cover('a', d(2026, 8, 1), d(2026, 8, 31)),
  cover('a', d(2026, 9, 1), d(2026, 9, 30)),
  cover('a', d(2026, 10, 1), d(2026, 10, 31)),
  // b: Premium, didn't renew after August (grace ended 7 Sept).
  cover('b', d(2026, 7, 1), d(2026, 7, 31), { planId: 'premium', monthlyValue: 15_000 }),
  cover('b', d(2026, 8, 1), d(2026, 8, 31), { planId: 'premium', monthlyValue: 15_000 }),
  // c: new in September, on a bundle share; expires in the next 30 days.
  cover('c', d(2026, 9, 15), d(2026, 10, 14), { viaBundle: true, monthlyValue: 6_300 })]
  );
  const revenue: RevenueFact[] = [
  { id: 'r1', payerId: 'a', paidAt: d(2026, 9, 1), amount: 7_000, line: 'standard', kind: 'renew' },
  { id: 'r2', payerId: 'assoc', paidAt: d(2026, 9, 14), amount: 18_900, line: 'bundle', kind: 'bundle_renewal' },
  { id: 'r3', payerId: 'b', paidAt: d(2026, 8, 1), amount: 15_000, line: 'premium', kind: 'upgrade' },
  { id: 'r4', payerId: 'x', paidAt: d(2026, 9, 20), amount: 2_000, line: 'starter', kind: 'downgrade' }];


  it('works out MRR from current subscribers only', () => {
    expect(mrrAt(covers, new Date(2026, 8, 30, 23), [], NOW)).toBe(7_000 + 6_300);
    expect(mrrAt(covers, new Date(2026, 7, 20), [], NOW)).toBe(7_000 + 15_000);
    // Suspended by Gwani right now: not counted.
    expect(mrrAt(covers, NOW, ['a'], NOW)).toBe(6_300);
  });

  it('sums revenue by plan and bundle, and per bucket', () => {
    expect(revenueByLine(revenue, SEPT)).toEqual({ starter: 2_000, standard: 7_000, premium: 0, bundle: 18_900 });
    const series = revenueSeries(revenue, bucketsFor(range('2026-08-01', '2026-09-30'), 'month'));
    expect(series.map((s) => s.premium)).toEqual([15_000, 0]);
    expect(planChanges(revenue, range('2026-08-01', '2026-09-30'))).toEqual({ upgrades: 1, downgrades: 1 });
  });

  it('measures churn over the period', () => {
    expect(churn(covers, SEPT, [], NOW)).toEqual({ atStart: 2, churned: 1, rate: 50 });
  });

  it('counts new, renewing and lapsed subscribers', () => {
    expect(subscriberMovements(covers, SEPT, NOW)).toEqual({ newCount: 1, renewing: 1, lapsed: 1 });
  });

  it('works out the renewal rate from periods whose grace is over', () => {
    // a renewed twice; b renewed after July but not after August.
    expect(renewalRate(covers, range('2026-07-01', '2026-08-31'), NOW)).toEqual({ ended: 4, renewed: 3, rate: 75 });
    // Ends whose grace isn't over yet aren't decided, so they don't count.
    expect(renewalRate(covers, range('2026-10-01', '2026-10-31'), NOW).rate).toBeNull();
  });

  it('lists revenue at risk and counts the plan mix', () => {
    const at = new Date(2026, 9, 2);
    const risk = expiringWithin(covers, at, 30, [], NOW);
    expect(risk.map((r) => [r.vendorId, r.monthlyValue])).toEqual([['c', 6_300], ['a', 7_000]]);
    expect(planMix(covers, at, [], NOW)).toEqual({ starter: 0, standard: 1, premium: 0, bundle: 1 });
  });

  it('counts back-to-back monthly renewals as renewed', () => {
    // Local start and end of day, like real covers: UTC end-of-day times would land on the next day in
    // timezones east of UTC (e.g. Africa/Lagos), outside the local-day range.
    const dayStart = (m: number, day: number) => new Date(2026, m - 1, day).toISOString();
    const dayEnd = (m: number, day: number) => new Date(2026, m - 1, day, 23, 59, 59, 999).toISOString();
    const monthly = coverByVendor([
    cover('m', dayStart(7, 1), dayEnd(7, 31)),
    cover('m', dayStart(7, 31), dayEnd(8, 31)),
    cover('m', dayStart(8, 31), dayEnd(9, 30))]
    );
    expect(renewalRate(monthly, range('2026-07-01', '2026-08-31'), NOW)).toEqual({ ended: 2, renewed: 2, rate: 100 });
  });

  it('includes subscribers already in grace in the revenue at risk', () => {
    const graceCover = coverByVendor([cover('g', d(2026, 9, 1), d(2026, 9, 30))]);
    const at = new Date(2026, 9, 3);
    expect(expiringWithin(graceCover, at, 30, [], NOW).map((r) => r.status)).toEqual(['grace']);
  });

  it('projects next month as MRR × renewal rate (an estimate)', () => {
    expect(projectNextMonth(10_000, 80)).toBe(8_000);
    expect(projectNextMonth(10_000, null)).toBe(10_000);
  });

  it('sums commission in the period', () => {
    expect(commissionIn([{ at: d(2026, 9, 5), amount: 500 }, { at: d(2026, 8, 5), amount: 900 }], SEPT)).toBe(500);
  });
});
