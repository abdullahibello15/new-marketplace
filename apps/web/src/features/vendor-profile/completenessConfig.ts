import { PROFILE_SECTION, profileSectionHref } from './constants';
import type { CategoryKind } from '../../types/marketplace';
import type { CompletenessItemId, CompletenessLabel, ProfileSectionId } from './types';

/*
 * Profile completeness: the ONE place the score is defined. The helper (utils/completeness.ts), the
 * dashboard card, the editor's section nav, the reminder banner, the admin queue and the search boost
 * all read this file. The score is never stored; it is computed from saved data every time.
 *
 * ⚠️ CONFIRM: every weight, minimum and threshold below is a PLACEHOLDER. Check them against the build
 * spec before launch. Weights must add up to 100 for each vendor kind (a unit test checks this).
 */

export interface CompletenessItemConfig {
  id: CompletenessItemId;
  /** Points out of 100. CONFIRM against the build spec. */
  weight: number;
  /** Which vendors this item counts for. Service and retail vendors each have their own set adding to 100. */
  kinds: readonly CategoryKind[];
  /** Where the vendor fixes it (a section of Edit Profile, or another page). */
  link: string;
  /** The Edit Profile section this item belongs to, for the tick/dot in the section nav. Null when fixed elsewhere. */
  section: ProfileSectionId | null;
}

const BOTH: readonly CategoryKind[] = ['service', 'retail'];

export const COMPLETENESS_RULES = {
  /** Bio counts once it has at least this many characters (after trimming). CONFIRM. */
  bioMinLength: 80,
  /** Portfolio counts at this many photos. CONFIRM. */
  portfolioMinPhotos: 3,
  /** Retail: products needed. CONFIRM. */
  productsMin: 1,
  /** Service: services with a price range needed. CONFIRM. */
  servicesMin: 1,
  /** Below this score the vendor sees a reminder banner. Nothing is ever blocked. CONFIRM. */
  reminderThreshold: 60,
  /**
   * Search ranking: how much a complete profile helps, as a fraction of the sort's own measure.
   * 0.05 means a 100% profile is treated as 5% nearer (Nearest) or 5% better rated (Top rated);
   * a 0% profile gets no boost. Price sort is never reordered (only ties use it). Low-score vendors
   * are never hidden. Set to 0 to switch the boost off. CONFIRM.
   */
  searchBoostWeight: 0.05
} as const;

/** Highest value first is how the dashboard checklist orders missing items (ties keep this order). */
export const COMPLETENESS_ITEMS: readonly CompletenessItemConfig[] = [
// CONFIRM all weights: placeholders adding to 100 for each kind.
{ id: 'photo', weight: 10, kinds: BOTH, section: PROFILE_SECTION.About, link: profileSectionHref(PROFILE_SECTION.About) },
{ id: 'businessName', weight: 10, kinds: BOTH, section: PROFILE_SECTION.About, link: profileSectionHref(PROFILE_SECTION.About) },
{ id: 'tradeCategory', weight: 5, kinds: BOTH, section: PROFILE_SECTION.About, link: profileSectionHref(PROFILE_SECTION.About) },
{ id: 'bio', weight: 10, kinds: BOTH, section: PROFILE_SECTION.About, link: profileSectionHref(PROFILE_SECTION.About) },
{ id: 'portfolio', weight: 15, kinds: BOTH, section: PROFILE_SECTION.Portfolio, link: profileSectionHref(PROFILE_SECTION.Portfolio) },
{ id: 'services', weight: 15, kinds: ['service'], section: PROFILE_SECTION.Services, link: profileSectionHref(PROFILE_SECTION.Services) },
{ id: 'products', weight: 15, kinds: ['retail'], section: null, link: '/pro/catalogue/products/new' },
{ id: 'workingHours', weight: 5, kinds: BOTH, section: PROFILE_SECTION.Hours, link: profileSectionHref(PROFILE_SECTION.Hours) },
{ id: 'serviceAreas', weight: 5, kinds: BOTH, section: PROFILE_SECTION.Areas, link: profileSectionHref(PROFILE_SECTION.Areas) },
{ id: 'phoneVerified', weight: 5, kinds: BOTH, section: null, link: '/profile' },
{ id: 'emailAdded', weight: 5, kinds: BOTH, section: null, link: '/profile' },
{ id: 'documentsSubmitted', weight: 15, kinds: BOTH, section: null, link: '/pro/verification' }];


/** Score bands for the label next to the ring, lowest first: a score gets the last band it reaches. CONFIRM. */
export const COMPLETENESS_LABELS: readonly {id: CompletenessLabel;minScore: number;}[] = [
{ id: 'gettingStarted', minScore: 0 },
{ id: 'good', minScore: 50 },
{ id: 'almostThere', minScore: 80 },
{ id: 'complete', minScore: 100 }];
