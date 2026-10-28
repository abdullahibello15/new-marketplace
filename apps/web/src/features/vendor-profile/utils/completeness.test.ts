import { describe, expect, it } from 'vitest';
import { makeWorkingHours } from '../../../data/weekdays';
import { COMPLETENESS_ITEMS, COMPLETENESS_RULES } from '../completenessConfig';
import { PROFILE_SECTION } from '../constants';
import { calculateProfileCompleteness, completenessKindOf, completenessLabel, missingItems, needsCompletenessReminder, sectionCompleteness } from './completeness';
import { PLACEHOLDER_VENDOR_PHOTO } from './draftVendor';
import type { CompletenessInput } from '../types';

const NO_ACCOUNT = { phoneVerified: false, emailAdded: false, documentsSubmitted: false };
const FULL_ACCOUNT = { phoneVerified: true, emailAdded: true, documentsSubmitted: true };

function empty(kind: CompletenessInput['kind']): CompletenessInput {
  return {
    kind,
    profile: {
      photo: PLACEHOLDER_VENDOR_PHOTO,
      name: '',
      tradeCategory: '',
      bio: '',
      gallery: [],
      services: [],
      productCount: 0,
      workingHours: makeWorkingHours({}),
      serviceAreas: []
    },
    account: NO_ACCOUNT
  };
}

function complete(kind: CompletenessInput['kind']): CompletenessInput {
  return {
    kind,
    profile: {
      photo: '/me.jpg',
      name: 'Bala Plumbing',
      tradeCategory: kind === 'retail' ? 'grocer' : 'plumber',
      bio: 'x'.repeat(COMPLETENESS_RULES.bioMinLength),
      gallery: ['/1.jpg', '/2.jpg', '/3.jpg'],
      services: kind === 'service' ? [{ minPrice: 2000, maxPrice: 5000 }] : [],
      productCount: kind === 'retail' ? 1 : 0,
      workingHours: makeWorkingHours({ mon: ['08:00', '18:00'] }),
      serviceAreas: ['Chanchaga']
    },
    account: FULL_ACCOUNT
  };
}

describe('config', () => {
  it.each(['service', 'retail'] as const)('weights add up to 100 for %s vendors', (kind) => {
    expect(COMPLETENESS_ITEMS.filter((c) => c.kinds.includes(kind)).reduce((s, c) => s + c.weight, 0)).toBe(100);
  });
});

describe('calculateProfileCompleteness', () => {
  it.each(['service', 'retail'] as const)('scores an empty %s profile 0 with every item missing', (kind) => {
    const r = calculateProfileCompleteness(empty(kind));
    expect(r.score).toBe(0);
    expect(r.items.every((i) => !i.done)).toBe(true);
  });

  it.each(['service', 'retail'] as const)('scores a complete %s profile 100', (kind) => {
    const r = calculateProfileCompleteness(complete(kind));
    expect(r.score).toBe(100);
    expect(missingItems(r)).toEqual([]);
  });

  it('scores a partial profile by the weights of what is done', () => {
    const input = complete('service');
    input.profile.gallery = ['/1.jpg', '/2.jpg'];
    input.account = { ...FULL_ACCOUNT, emailAdded: false };
    const r = calculateProfileCompleteness(input);
    const weight = (id: string) => COMPLETENESS_ITEMS.find((c) => c.id === id)?.weight ?? 0;
    expect(r.score).toBe(100 - weight('portfolio') - weight('emailAdded'));
    expect(r.items.find((i) => i.id === 'portfolio')?.done).toBe(false);
  });

  it('counts services for service vendors and products for retail vendors', () => {
    const service = calculateProfileCompleteness(complete('service')).items.map((i) => i.id);
    const retail = calculateProfileCompleteness(complete('retail')).items.map((i) => i.id);
    expect(service).toContain('services');
    expect(service).not.toContain('products');
    expect(retail).toContain('products');
    expect(retail).not.toContain('services');
  });

  it('a retail vendor with services but no products is missing products', () => {
    const input = complete('retail');
    input.profile.services = [{ minPrice: 1000, maxPrice: 2000 }];
    input.profile.productCount = 0;
    expect(missingItems(calculateProfileCompleteness(input)).map((i) => i.id)).toEqual(['products']);
  });

  it('needs a minimum bio length and a real photo', () => {
    const input = complete('service');
    input.profile.bio = 'x'.repeat(COMPLETENESS_RULES.bioMinLength - 1);
    input.profile.photo = PLACEHOLDER_VENDOR_PHOTO;
    expect(missingItems(calculateProfileCompleteness(input)).map((i) => i.id).sort()).toEqual(['bio', 'photo']);
  });

  it('needs the custom trade name when the trade is "other"', () => {
    const input = complete('service');
    input.profile.tradeCategory = 'other';
    expect(calculateProfileCompleteness(input).items.find((i) => i.id === 'tradeCategory')?.done).toBe(false);
    input.profile.tradeCategoryOther = 'Welder';
    expect(calculateProfileCompleteness(input).items.find((i) => i.id === 'tradeCategory')?.done).toBe(true);
  });

  it('gives every item a hint key and a link', () => {
    for (const i of calculateProfileCompleteness(empty('service')).items) {
      expect(i.hint).toBe(`vendor:completeness.item.${i.id}.hint`);
      expect(i.link).toBeTruthy();
    }
  });
});

describe('missing items', () => {
  it('lists the most valuable first', () => {
    const weights = missingItems(calculateProfileCompleteness(empty('service'))).map((i) => i.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });
});

describe('labels, sections and reminder', () => {
  it('maps scores to labels', () => {
    expect(completenessLabel(0)).toBe('gettingStarted');
    expect(completenessLabel(49)).toBe('gettingStarted');
    expect(completenessLabel(50)).toBe('good');
    expect(completenessLabel(80)).toBe('almostThere');
    expect(completenessLabel(99)).toBe('almostThere');
    expect(completenessLabel(100)).toBe('complete');
  });

  it('marks a section done only when all its items are done', () => {
    const input = complete('service');
    input.profile.bio = '';
    const sections = sectionCompleteness(calculateProfileCompleteness(input));
    expect(sections.get(PROFILE_SECTION.About)).toBe(false);
    expect(sections.get(PROFILE_SECTION.Portfolio)).toBe(true);
    expect(sections.has(PROFILE_SECTION.Payments)).toBe(false);
  });

  it('reminds below the threshold only', () => {
    expect(needsCompletenessReminder(COMPLETENESS_RULES.reminderThreshold - 1)).toBe(true);
    expect(needsCompletenessReminder(COMPLETENESS_RULES.reminderThreshold)).toBe(false);
  });

  it('tells service and retail trades apart', () => {
    expect(completenessKindOf('grocer')).toBe('retail');
    expect(completenessKindOf('plumber')).toBe('service');
  });
});
