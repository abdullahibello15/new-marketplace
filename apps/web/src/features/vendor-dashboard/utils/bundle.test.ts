import { describe, expect, it } from 'vitest';
import { BUNDLE_RULES } from '../bundles';
import { discountPercentFor, quoteBundle, quoteMemberAdditions } from './bundle';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const endOf = (y: number, m: number, d: number) => new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();

describe('discount tiers', () => {
  it('applies the highest tier reached', () => {
    const [first, second] = BUNDLE_RULES.discountTiers;
    expect(discountPercentFor(first.minMembers - 1)).toBe(0);
    expect(discountPercentFor(first.minMembers)).toBe(first.percentOff);
    expect(discountPercentFor(second.minMembers - 1)).toBe(first.percentOff);
    expect(discountPercentFor(second.minMembers)).toBe(second.percentOff);
  });
});

describe('bundle invoice', () => {
  it('has one line per member, then the discount, and the lines add up to the total', () => {
    const q = quoteBundle(['Yusuf', 'Musa', 'Emeka', 'Grace'], 7000, 'Standard');
    expect(q.lines).toHaveLength(5);
    expect(q.subtotal).toBe(28000);
    expect(q.percentOff).toBe(discountPercentFor(4));
    expect(q.total).toBe(28000 - Math.round(28000 * q.percentOff / 100));
    expect(q.lines.reduce((s, l) => s + l.amount, 0)).toBe(q.total);
  });

  it('has no discount line below the first tier', () => {
    const q = quoteBundle(['A', 'B'], 7000, 'Standard');
    expect(q.discount).toBe(0);
    expect(q.lines).toHaveLength(2);
  });
});

describe('adding members mid-period', () => {
  it('prorates each new member for the days left, with the tier after they join', () => {
    // 30-day period, joining with 10 days left (today counts).
    const q = quoteMemberAdditions(['Bala'], 4, 7000, at(2026, 10, 1, 0).toISOString(), endOf(2026, 10, 30), at(2026, 10, 21));
    expect(q).toMatchObject({ remainingDays: 10, totalDays: 30, subtotal: 2333 });
    expect(q.total).toBe(2333 - Math.round(2333 * discountPercentFor(4) / 100));
    expect(q.lines.reduce((s, l) => s + l.amount, 0)).toBe(q.total);
  });

  it('on the last day only one day is charged', () => {
    const q = quoteMemberAdditions(['Bala'], 2, 7000, at(2026, 10, 1, 0).toISOString(), endOf(2026, 10, 30), at(2026, 10, 30));
    expect(q).toMatchObject({ remainingDays: 1, subtotal: Math.round(7000 / 30), discount: 0 });
  });
});
