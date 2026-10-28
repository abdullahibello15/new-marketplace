import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { date, message, money, nested } from '../domain/message';
import i18n from './index';
import { renderText, translate } from './message';

// test:tz runs every test under TZ=Africa/Lagos (UTC+1, no DST) and TZ=UTC.
const offsetMinutes = new Date('2026-10-28T12:00:00Z').getTimezoneOffset();
const zone = offsetMinutes === -60 ? 'Africa/Lagos' : offsetMinutes === 0 ? 'UTC' : 'other';

beforeAll(() => i18n.changeLanguage('en'));
afterAll(() => i18n.changeLanguage('en'));

describe('translate()', () => {
  it('formats money params from kobo', () => {
    expect(translate(message('jobs:policy.lateCustomerFee', { hours: 24, fee: money(1600) }))).toContain('₦1,600');
    expect(translate(message('jobs:policy.lateCustomerFee', { hours: 24, fee: { type: 'money', kobo: 123_456 } }))).toContain('₦1,234.56');
  });

  it('uses the fallback when a data label has no translation', () => {
    expect(translate(message('jobs:status.not_a_status.label', undefined, 'Not a status'))).toBe('Not a status');
  });

  it('lower-cases nested labels on request', () => {
    const text = translate(message('jobs:error.ended', { status: nested(message('jobs:status.closed.label', undefined, 'Closed'), { case: 'lower' }) }));
    expect(text).toContain('closed');
    expect(text).not.toContain('Closed');
  });

  it('passes data text through unchanged', () => {
    expect(renderText('Order #5001')).toBe('Order #5001');
  });
});

describe('date params near midnight', () => {
  // The window opens at 23:01 UTC on Wednesday 28 October: already Thursday in Lagos.
  const at = (iso: string) => translate(message('jobs:error.startFrom', { date: date(iso, 'weekdayDateTime') }));
  const expected: Record<string, Record<string, string>> = {
    'Africa/Lagos': {
      '2026-10-28T22:59:00.000Z': 'You can start this job from Wed 28 Oct, 11:59 PM.',
      '2026-10-28T23:01:00.000Z': 'You can start this job from Thu 29 Oct, 12:01 AM.',
      '2026-10-29T00:01:00.000Z': 'You can start this job from Thu 29 Oct, 1:01 AM.'
    },
    UTC: {
      '2026-10-28T22:59:00.000Z': 'You can start this job from Wed 28 Oct, 10:59 PM.',
      '2026-10-28T23:01:00.000Z': 'You can start this job from Wed 28 Oct, 11:01 PM.',
      '2026-10-29T00:01:00.000Z': 'You can start this job from Thu 29 Oct, 12:01 AM.'
    }
  };

  it.skipIf(zone === 'other')(`keeps the existing format and the local day (${zone})`, () => {
    for (const [iso, text] of Object.entries(expected[zone])) expect(at(iso), iso).toBe(text);
  });

  it.skipIf(zone === 'other')(`does the same in Hausa (${zone})`, async () => {
    await i18n.changeLanguage('ha');
    const day = zone === 'UTC' ? 'Lar 28 Okt, 11:01 na yamma' : 'Alh 29 Okt, 12:01 na safe';
    expect(at('2026-10-28T23:01:00.000Z')).toContain(day);
    await i18n.changeLanguage('en');
  });
});
