import { describe, expect, it } from 'vitest';
import { makeWorkingHours } from '../../../data/weekdays';
import { addBusinessMinutes, businessMinutesBetween, evaluateAll, evaluateResponse, isWorkingTime, percentile, slaDeadline, slaStats, typicalResponseMinutes, type VendorSchedule } from './sla';

// Mon–Fri 08:00–18:00, Sat 09:00–13:00, Sun closed. 5 Oct 2026 is a Monday.
const HOURS = makeWorkingHours({
  mon: ['08:00', '18:00'],
  tue: ['08:00', '18:00'],
  wed: ['08:00', '18:00'],
  thu: ['08:00', '18:00'],
  fri: ['08:00', '18:00'],
  sat: ['09:00', '13:00']
});
const schedule = (blocked: string[] = []): VendorSchedule => ({ workingHours: HOURS, blockedDates: new Set(blocked) });
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m); // October 2026
const RULE = { withinHoursMinutes: 120, afterHoursWallClockMinutes: 720 };

describe('working time', () => {
  it('knows when the vendor is working', () => {
    expect(isWorkingTime(at(5, 9), schedule())).toBe(true);
    expect(isWorkingTime(at(5, 18), schedule())).toBe(false);
    expect(isWorkingTime(at(4, 12), schedule())).toBe(false); // Sunday
    expect(isWorkingTime(at(6, 9), schedule(['2026-10-06']))).toBe(false); // blocked Tuesday
  });

  it('counts only working minutes between two moments', () => {
    expect(businessMinutesBetween(at(5, 10), at(5, 11, 30), schedule())).toBe(90);
    // Friday 17:00 → Monday 09:00: 1h Friday, 4h Saturday, nothing Sunday, 1h Monday.
    expect(businessMinutesBetween(at(9, 17), at(12, 9), schedule())).toBe(360);
    // Overnight doesn't count.
    expect(businessMinutesBetween(at(5, 20), at(6, 8), schedule())).toBe(0);
    expect(businessMinutesBetween(at(5, 12), at(5, 10), schedule())).toBe(0);
  });

  it('adds working minutes, pausing at closing time and on blocked days', () => {
    expect(addBusinessMinutes(at(5, 17), 120, schedule())).toEqual(at(6, 9));
    expect(addBusinessMinutes(at(5, 17), 120, schedule(['2026-10-06']))).toEqual(at(7, 9));
  });
});

describe('slaDeadline', () => {
  it('gives working-hours requests the working-time target', () => {
    expect(slaDeadline(at(5, 10), RULE, schedule())).toEqual(at(5, 12));
    // Runs past closing: 1h today, 1h tomorrow morning.
    expect(slaDeadline(at(5, 17), RULE, schedule())).toEqual(at(6, 9));
  });

  it('gives after-hours requests the later of 12 real hours and 2 working hours after opening', () => {
    // Monday 20:00: 12h → Tue 08:00; 2 working hours after opening → Tue 10:00. Later wins.
    expect(slaDeadline(at(5, 20), RULE, schedule())).toEqual(at(6, 10));
    // Monday 05:00 (before opening): 12h → 17:00, 2 working hours after opening → 10:00. Later wins.
    expect(slaDeadline(at(5, 5), RULE, schedule())).toEqual(at(5, 17));
  });

  it('doesn’t run the clock over a weekend', () => {
    // Saturday 14:00 (after Saturday closing): Sunday is closed, so it's due 2 working hours into Monday.
    expect(slaDeadline(at(10, 14), RULE, schedule())).toEqual(at(12, 10));
    // Saturday 12:00 (open): 1h Saturday, then 1h on Monday.
    expect(slaDeadline(at(10, 12), RULE, schedule())).toEqual(at(12, 9));
  });

  it('skips the vendor’s blocked days', () => {
    expect(slaDeadline(at(5, 17), RULE, schedule(['2026-10-06']))).toEqual(at(7, 9));
    // Arrives on a blocked day: after hours, so due 2 working hours into the next open day.
    expect(slaDeadline(at(6, 10), RULE, schedule(['2026-10-06']))).toEqual(at(7, 10));
  });

  it('uses plain elapsed time when the vendor has no working hours set', () => {
    const none: VendorSchedule = { workingHours: makeWorkingHours({}), blockedDates: new Set() };
    expect(slaDeadline(at(5, 20), RULE, none)).toEqual(at(5, 22));
    expect(businessMinutesBetween(at(5, 20), at(5, 22), none)).toBe(120);
  });
});

describe('evaluateResponse', () => {
  const now = at(8, 12);

  it('is met when answered by the deadline, with the working-time response', () => {
    expect(evaluateResponse(at(5, 20), at(6, 9), RULE, schedule(), now)).toMatchObject({ verdict: 'met', responseMinutes: 60, lateMinutes: 0 });
  });

  it('is breached when answered late, with how late in working time', () => {
    expect(evaluateResponse(at(5, 10), at(5, 13), RULE, schedule(), now)).toMatchObject({ verdict: 'breached', responseMinutes: 180, lateMinutes: 60 });
  });

  it('is breached when unanswered past the deadline, and pending before it', () => {
    expect(evaluateResponse(at(5, 10), null, RULE, schedule(), now).verdict).toBe('breached');
    expect(evaluateResponse(at(8, 11), null, RULE, schedule(), now).verdict).toBe('pending');
  });
});

describe('typical response', () => {
  it('takes percentiles by nearest rank', () => {
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 50)).toBe(50);
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 90)).toBe(90);
    expect(percentile([], 50)).toBeNull();
  });

  it('is the median of recent responses, once there are enough', () => {
    const now = at(30, 12);
    const r = (day: number, minutes: number | null) => ({ requestedAt: at(day, 10), responseMinutes: minutes });
    expect(typicalResponseMinutes([r(20, 30), r(21, 90), r(22, 60), r(23, null)], now)).toBe(60);
    expect(typicalResponseMinutes([r(20, 30), r(21, 90)], now)).toBeNull();
  });
});

describe('many responses', () => {
  it('judges each on its own rule and summarises met, breached and pending', () => {
    const r = (type: 'first_response' | 'quote', requested: Date, responded: Date | null) => ({ vendorId: 'v', type, requestedAt: requested.toISOString(), respondedAt: responded?.toISOString() ?? null });
    const judged = evaluateAll(
      [
      r('first_response', at(5, 10), at(5, 11)), // 60 min: met
      r('first_response', at(5, 10), at(5, 13)), // 180 min: breached (2h rule)
      r('quote', at(5, 10), at(5, 13)), // 180 min: met (4h rule)
      r('first_response', at(5, 11), null), // unanswered at 12:00: pending
      r('first_response', at(2, 9), null)], // unanswered since Friday: breached
      () => schedule(),
      at(5, 12),
      { first_response: RULE, quote: { withinHoursMinutes: 240, afterHoursWallClockMinutes: 1440 }, order_confirm: RULE, dispute_response: RULE, reschedule_response: RULE }
    );
    expect(judged.map((j) => j.outcome.verdict)).toEqual(['met', 'breached', 'met', 'pending', 'breached']);
    expect(slaStats(judged)).toEqual({ total: 5, met: 2, breached: 2, pending: 1, compliance: 50, average: 140, median: 180, p90: 180 });
    expect(slaStats([]).compliance).toBeNull();
  });
});
