import { findTradeCategory, OTHER_TRADE } from '../../../data/tradeCategories';
import { COMPLETENESS_ITEMS, COMPLETENESS_LABELS, COMPLETENESS_RULES } from '../completenessConfig';
import { NAME_MIN } from '../constants';
import { hasOwnPhoto } from './draftVendor';
import type { CategoryKind } from '../../../types/marketplace';
import type { CompletenessInput, CompletenessItemId, CompletenessLabel, ProfileCompleteness, ProfileSectionId } from '../types';

/** Service or retail, from the trade category (unknown trades count as service). */
export const completenessKindOf = (tradeCategory: string): CategoryKind => findTradeCategory(tradeCategory)?.kind === 'retail' ? 'retail' : 'service';

const CHECKS: Record<CompletenessItemId, (input: CompletenessInput) => boolean> = {
  photo: ({ profile }) => hasOwnPhoto(profile.photo),
  businessName: ({ profile }) => profile.name.trim().length >= NAME_MIN,
  tradeCategory: ({ profile }) =>
  Boolean(findTradeCategory(profile.tradeCategory)) && (profile.tradeCategory !== OTHER_TRADE || Boolean(profile.tradeCategoryOther?.trim())),
  bio: ({ profile }) => (profile.bio ?? '').trim().length >= COMPLETENESS_RULES.bioMinLength,
  portfolio: ({ profile }) => profile.gallery.length >= COMPLETENESS_RULES.portfolioMinPhotos,
  services: ({ profile }) =>
  profile.services.filter((s) => s.minPrice > 0 && s.maxPrice >= s.minPrice).length >= COMPLETENESS_RULES.servicesMin,
  products: ({ profile }) => profile.productCount >= COMPLETENESS_RULES.productsMin,
  workingHours: ({ profile }) => Object.values(profile.workingHours).some((d) => d.open),
  serviceAreas: ({ profile }) => profile.serviceAreas.length > 0,
  phoneVerified: ({ account }) => account.phoneVerified,
  emailAdded: ({ account }) => account.emailAdded,
  documentsSubmitted: ({ account }) => account.documentsSubmitted
};

/**
 * The completeness score from a vendor's data. Pure: the same input always gives the same result, and
 * nothing is stored. Only the items for the vendor's kind (service or retail) count.
 */
export function calculateProfileCompleteness(input: CompletenessInput): ProfileCompleteness {
  const items = COMPLETENESS_ITEMS.filter((c) => c.kinds.includes(input.kind)).map((c) => ({
    id: c.id,
    done: CHECKS[c.id](input),
    weight: c.weight,
    hint: `vendor:completeness.item.${c.id}.hint`,
    link: c.link
  }));
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  const earned = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  return { score: total ? Math.round(earned / total * 100) : 0, items };
}

/** Missing items, most valuable first (ties keep config order). */
export const missingItems = (result: ProfileCompleteness) => result.items.filter((i) => !i.done).sort((a, b) => b.weight - a.weight);

export function completenessLabel(score: number): CompletenessLabel {
  return COMPLETENESS_LABELS.reduce<CompletenessLabel>((label, band) => score >= band.minScore ? band.id : label, COMPLETENESS_LABELS[0].id);
}

/** Per Edit Profile section: true when every item in it is done. Sections without scored items are left out. */
export function sectionCompleteness(result: ProfileCompleteness): Map<ProfileSectionId, boolean> {
  const out = new Map<ProfileSectionId, boolean>();
  for (const item of result.items) {
    const section = COMPLETENESS_ITEMS.find((c) => c.id === item.id)?.section;
    if (section) out.set(section, (out.get(section) ?? true) && item.done);
  }
  return out;
}

/** True when the score is low enough for the reminder banner. */
export const needsCompletenessReminder = (score: number) => score < COMPLETENESS_RULES.reminderThreshold;
