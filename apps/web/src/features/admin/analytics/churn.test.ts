import { describe, expect, it } from 'vitest';
import { coverByVendor } from './aggregations';
import { activityTrend, averageLifetimeMonths, churnBreakdown, churnEvents, churnSeries, churnSummary, cohortRetention, isActiveAt, ratingTrend, winBacks, type ChurnContext } from './churn';
import { bucketsFor } from './aggregations';
import type { CoverageFact, DateRange, VendorFact, WorkFact } from './types';

const NOW = new Date(2026, 9, 8, 12); // 8 Oct 2026
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12).toISOString();
const range = (from: string, to: string): DateRange => ({ start: new Date(`${from}T00:00:00`), end: new Date(`${to}T23:59:59.999`) });

const vendor = (id: string, joined: string, over: Partial<VendorFact> = {}): VendorFact => ({
  id,
  name: id,
  kind: 'service',
  category: 'plumber',
  serviceAreas: ['Chanchaga'],
  verification: 'id',
  joinedAt: joined,
  leftAt: null,
  current: true,
  ...over
});
const month = (vendorId: string, startMonth: number, year = 2026, extra: Partial<CoverageFact> = {}): CoverageFact => ({
  vendorId,
  start: new Date(year, startMonth - 1, 1).toISOString(),
  end: new Date(year, startMonth, 0, 23, 59, 59, 999).toISOString(),
  monthlyValue: 7_000,
  planId: 'standard',
  viaBundle: false,
  ...extra
});
let n = 0;
const done = (vendorId: string, completedAt: string): WorkFact => ({
  id: `w${++n}`,
  kind: 'service',
  vendorId,
  category: 'plumber',
  lga: 'Chanchaga',
  requestedAt: completedAt,
  quotedAt: completedAt,
  acceptedAt: completedAt,
  completedAt,
  cancelledAt: null,
  disputedAt: null,
  value: 10_000,
  paidVia: 'escrow'
});

// a: paid every month Jun–Oct. b: paid Jun–Jul, lapsed (grace ended 7 Aug), came back in September.
// c: paid Jun–Aug, lapsed (grace ended 7 Sept). Activity: a works all along; c stops after 1 July.
const vendors = [vendor('a', d(2026, 6, 1)), vendor('b', d(2026, 6, 1), { category: 'tailor' }), vendor('c', d(2026, 6, 1), { category: 'tailor' })];
const cover = coverByVendor([
...[6, 7, 8, 9, 10].map((m) => month('a', m)),
month('b', 6),
month('b', 7),
month('b', 9),
month('b', 10),
...[6, 7, 8].map((m) => month('c', m))]
);
const work = [
...['2026-06-10', '2026-07-10', '2026-08-10', '2026-09-10', '2026-10-01'].map((x) => done('a', `${x}T12:00:00.000Z`)),
done('c', '2026-07-01T12:00:00.000Z'),
done('b', '2026-06-15T12:00:00.000Z'),
done('b', '2026-09-20T12:00:00.000Z')];

const ctx: ChurnContext = { vendors, cover, work, now: NOW, inactiveDays: 45 };

describe('subscription churn', () => {
  it('finds lapses and returns', () => {
    const events = churnEvents('subscription', ctx);
    expect(events.map((e) => [e.vendorId, e.at.getMonth() + 1, e.returnedAt?.getMonth() ?? null])).toEqual([
    ['b', 8, 8], // lapsed in August, back in September (month index 8)
    ['c', 9, null]]
    );
  });

  it('measures churn among subscribers at the start of the period', () => {
    // b's return payment starts 1 September, so b is subscribed again at the start of September.
    expect(churnSummary('subscription', ctx, range('2026-09-01', '2026-09-30'))).toMatchObject({ atStart: 3, churned: 1, retained: 2, rate: 33.3 });
    expect(churnSummary('subscription', ctx, range('2026-08-01', '2026-08-31'))).toMatchObject({ atStart: 3, churned: 1, rate: 33.3 });
  });

  it('lists win-backs with how long they were away', () => {
    const back = winBacks('subscription', ctx, range('2026-09-01', '2026-09-30'));
    expect(back).toHaveLength(1);
    expect(back[0].vendorId).toBe('b');
    expect(back[0].daysAway).toBeGreaterThan(20);
  });
});

describe('activity churn', () => {
  it('churns after the inactive days with no completion, and returns on the next one', () => {
    const events = churnEvents('activity', ctx);
    // c: last completion 1 July → churned 15 August. b: 15 June → churned 30 July, back 20 September.
    expect(events.map((e) => [e.vendorId, e.at.toISOString().slice(0, 10)])).toEqual([
    ['b', '2026-07-30'],
    ['c', '2026-08-15']]
    );
    expect(events[0].returnedAt?.toISOString().slice(0, 10)).toBe('2026-09-20');
  });

  it('treats new vendors as active until they’ve had time to work', () => {
    expect(isActiveAt('activity', vendor('new', d(2026, 10, 1)), NOW, ctx)).toBe(true);
    expect(isActiveAt('activity', vendors[2], NOW, ctx)).toBe(false);
  });
});

describe('series, lifetime, cohorts and breakdowns', () => {
  it('gives a churn rate per bucket', () => {
    const series = churnSeries('subscription', ctx, bucketsFor(range('2026-07-01', '2026-09-30'), 'month'));
    expect(series.map((s) => s.churned)).toEqual([0, 1, 1]);
  });

  it('averages lifetime up to the last churn that didn’t end in a return', () => {
    // a and b: Jun 1 → now (~4.2 months); c: Jun 1 → 7 Sept (~3.2 months).
    expect(averageLifetimeMonths('subscription', ctx)).toBeCloseTo(3.9, 0);
  });

  it('builds cohort retention by joining month', () => {
    const rows = cohortRetention('subscription', ctx, 5);
    const june = rows.find((r) => r.cohort === '2026-06');
    expect(june?.size).toBe(3);
    // End of June 3/3; July 3/3; end of August: b is lapsed (2/3); September: b back, c gone (2/3).
    expect(june?.cells.map((c) => c.share)).toEqual([100, 100, 66.7, 66.7, 66.7]);
  });

  it('breaks churn down by group', () => {
    const rows = churnBreakdown('subscription', ctx, range('2026-09-01', '2026-09-30'), (v) => v.category);
    expect(rows).toEqual([
    { group: 'tailor', atStart: 2, churned: 1, rate: 50 },
    { group: 'plumber', atStart: 1, churned: 0, rate: 0 }]
    );
  });
});

describe('closed accounts', () => {
  // d: paid Jun–Oct but closed the account on 15 Aug, before any lapse or 45-day gap.
  const closed = vendor('d', d(2026, 6, 1), { leftAt: d(2026, 8, 15), current: false });
  const closedCtx: ChurnContext = {
    vendors: [closed],
    cover: coverByVendor([6, 7, 8, 9, 10].map((m) => month('d', m))),
    work: [done('d', d(2026, 7, 20)), done('d', d(2026, 8, 10)), done('d', d(2026, 9, 10))],
    now: NOW
  };

  it('count as churn when they leave, under both definitions', () => {
    for (const type of ['subscription', 'activity'] as const) {
      expect(churnEvents(type, closedCtx)).toEqual([{ vendorId: 'd', at: new Date(d(2026, 8, 15)), returnedAt: null }]);
      expect(churnSummary(type, closedCtx, range('2026-08-01', '2026-08-31'))).toMatchObject({ atStart: 1, churned: 1, rate: 100 });
    }
  });
});

describe('at-risk signals', () => {
  it('flags falling activity only with enough work before', () => {
    const w = [...[1, 3, 5, 7].map((day) => done('x', `2026-08-${String(day + 10).padStart(2, '0')}T12:00:00.000Z`)), done('x', '2026-09-20T12:00:00.000Z')];
    expect(activityTrend('x', w, NOW)).toEqual({ recent: 1, before: 4, falling: true });
    expect(activityTrend('y', [done('y', '2026-08-20T12:00:00.000Z')], NOW).falling).toBe(false);
  });

  it('flags a declining rating when the latest reviews drop well below the earlier ones', () => {
    expect(ratingTrend([5, 5, 5, 5, 5, 4, 4, 3, 3, 4])).toEqual({ recent: 3.6, earlier: 5, declining: true });
    expect(ratingTrend([5, 4, 5, 4, 5, 4, 5, 4, 5, 4]).declining).toBe(false);
    expect(ratingTrend([1, 1, 1]).declining).toBe(false);
  });
});
