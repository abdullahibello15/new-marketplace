import { findTradeCategory } from '../../../data/tradeCategories';
import { makeWorkingHours } from '../../../data/weekdays';
import type { NigerLga, TradeCategory, Vendor } from '../../../types/marketplace';

/*
 * A brand-new vendor profile, as the profile editor, verification and subscription features expect it:
 * unverified, no photos, services or products yet, Mon–Sat 8am–6pm. Used when a provider signs up and
 * when a vendor claims the profile their trade association created. They fill in the rest in Edit Profile.
 */

/** Shown until a new vendor adds their own photo. */
export const PLACEHOLDER_VENDOR_PHOTO = '/vendor-placeholder.svg';

export interface DraftVendorInput {
  id: string;
  businessName: string;
  tradeCategory: TradeCategory;
  lga: NigerLga;
  town: string;
  bio?: string;
  yearsExperience?: number | null;
  serviceAreas?: NigerLga[];
}

export function buildDraftVendor(input: DraftVendorInput): Vendor {
  const trade = findTradeCategory(input.tradeCategory)?.label ?? 'Vendor';
  const bio = input.bio?.trim() ?? '';
  return {
    id: input.id,
    name: input.businessName.trim(),
    lga: `${input.lga} LGA`,
    coordinates: null,
    rating: 0,
    reviews: 0,
    distanceKm: 0,
    tagline: input.town.trim() ? `${trade} in ${input.town.trim()}` : trade,
    verification: 'unverified',
    yearsExperience: input.yearsExperience ?? 0,
    about: bio,
    bio,
    priceRange: '',
    responseTime: '',
    responseTimeMinutes: null,
    photo: PLACEHOLDER_VENDOR_PHOTO,
    gallery: [],
    tradeCategory: input.tradeCategory,
    services: [],
    workingHours: makeWorkingHours({ mon: ['08:00', '18:00'], tue: ['08:00', '18:00'], wed: ['08:00', '18:00'], thu: ['08:00', '18:00'], fri: ['08:00', '18:00'], sat: ['08:00', '18:00'] }),
    serviceAreas: input.serviceAreas?.length ? input.serviceAreas : [input.lga],
    products: []
  };
}

/** "Aisha Tailoring Hub" → "aisha-tailoring-hub", or "-2", "-3"… if that id is taken. */
export function uniqueVendorId(businessName: string, taken: ReadonlySet<string>): string {
  const base = businessName.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'vendor';
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
