import { describe, expect, it } from 'vitest';
import { date, message, money, nested } from './message';

describe('money(): naira → kobo at the message boundary', () => {
  it('converts whole naira', () => {
    expect(money(1600)).toEqual({ type: 'money', kobo: 160_000 });
    expect(money(20_000)).toEqual({ type: 'money', kobo: 2_000_000 });
    expect(money(0)).toEqual({ type: 'money', kobo: 0 });
    expect(money(-1500)).toEqual({ type: 'money', kobo: -150_000 });
  });

  it('converts amounts that are not round numbers, including floating-point artefacts', () => {
    expect(money(1234.5).kobo).toBe(123_450);
    expect(money(1234.56).kobo).toBe(123_456); // 1234.56 * 100 = 123455.99999999999
    expect(money(0.01).kobo).toBe(1);
    expect(money(999.99).kobo).toBe(99_999);
    expect(money(0.1 + 0.2).kobo).toBe(30); // 0.30000000000000004
    expect(money(-0.5).kobo).toBe(-50);
    expect(Object.is(money(-0).kobo, 0)).toBe(true);
  });

  it('refuses amounts that are not a whole number of kobo, instead of rounding them', () => {
    for (const naira of [0.125, 1234.567, 0.001, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => money(naira), String(naira)).toThrow(RangeError);
    }
  });
});

describe('message helpers', () => {
  it('builds a message without empty fields', () => {
    expect(message('jobs:error.noQuote')).toEqual({ key: 'jobs:error.noQuote' });
    expect(message('jobs:status.x.label', undefined, 'X')).toEqual({ key: 'jobs:status.x.label', fallback: 'X' });
  });

  it('keeps dates as ISO instants with a style', () => {
    expect(date(new Date('2026-10-28T23:01:00.000Z'), 'weekdayDateTime')).toEqual({ type: 'date', iso: '2026-10-28T23:01:00.000Z', style: 'weekdayDateTime' });
  });

  it('nests messages, optionally lower-cased', () => {
    expect(nested(message('jobs:actor.vendor'), { case: 'lower' })).toEqual({ type: 'message', message: { key: 'jobs:actor.vendor' }, case: 'lower' });
  });
});
