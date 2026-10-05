import { z } from 'zod';
import { nigerLgas } from '../../data/nigerLgas';
import { findTradeCategory } from '../../data/tradeCategories';
import { findVerificationTier } from '../../data/verificationTiers';
import { parseNumberInput } from '../../lib/numberInput';
import {
  AREA_MODE,
  PLACE_KIND,
  PRICE_INPUT_MAX,
  RADIUS_MAX_KM,
  RADIUS_MIN_KM,
  RECENT_SEARCHES_MAX } from
'./constants';
import type { NigerLga, TradeCategory, Verification } from '../../types/marketplace';

/* Schemas for data read back from localStorage, which can't be trusted to match the current types. */

const lga = z.custom<NigerLga>((v) => nigerLgas.some((l) => l === v));
const tradeCategory = z.custom<TradeCategory>((v) => typeof v === 'string' && findTradeCategory(v) !== undefined);

export const placeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(PLACE_KIND),
  lga,
  context: z.string(),
  coordinates: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
});

const searchTargetSchema = z.discriminatedUnion('kind', [
z.object({ kind: z.literal('category'), category: tradeCategory }),
z.object({ kind: z.literal('query'), query: z.string().min(1) })]
);

/* Filter form (the left column on desktop, the bottom sheet on phones). */

const verification = z.custom<Verification>((v) => typeof v === 'string' && findVerificationTier(v) !== undefined);

const priceField = z.string().transform((raw, ctx) => {
  const value = parseNumberInput(raw);
  if (Number.isNaN(value)) {
    ctx.addIssue({ code: 'custom', message: 'Use whole Naira, like 5,000.' });
    return z.NEVER;
  }
  if (value !== null && value > PRICE_INPUT_MAX) {
    ctx.addIssue({ code: 'custom', message: 'That price looks too high. Check for extra zeros.' });
    return z.NEVER;
  }
  return value;
});

export const filterFormSchema = z.
object({
  categories: z.array(tradeCategory),
  tiers: z.array(verification),
  areaMode: z.enum(AREA_MODE),
  radiusKm: z.number().int().min(RADIUS_MIN_KM).max(RADIUS_MAX_KM),
  lgas: z.array(lga),
  priceMin: priceField,
  priceMax: priceField
}).
superRefine((v, ctx) => {
  if (v.priceMin !== null && v.priceMax !== null && v.priceMax < v.priceMin) {
    ctx.addIssue({ code: 'custom', path: ['priceMax'], message: 'Max price can’t be less than min price.' });
  }
  if (v.areaMode === AREA_MODE.Lga && v.lgas.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['lgas'], message: 'Pick at least one LGA, or switch to distance.' });
  }
});

export type FilterFormValues = z.input<typeof filterFormSchema>;
export type FilterFormData = z.output<typeof filterFormSchema>;

export const recentSearchesSchema = z.array(z.object({ label: z.string().min(1), target: searchTargetSchema })).max(RECENT_SEARCHES_MAX);
