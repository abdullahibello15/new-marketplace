import { buildDraftVendor } from './draftVendor';
import type { NigerLga, TradeCategory, Vendor } from '../../../types/marketplace';

/** Converts the API's concise vendor resource to the shape used by the existing vendor screens. */
export function apiVendorToVendor(record: Record<string, unknown>): Vendor {
  const draft = buildDraftVendor({
    id: String(record.id),
    businessName: String(record.businessName ?? record.name ?? ''),
    tradeCategory: String(record.tradeCategory) as TradeCategory,
    lga: String(record.lga) as NigerLga,
    town: String(record.town ?? ''),
    bio: typeof record.bio === 'string' ? record.bio : undefined,
  });
  const profile = record as Partial<Vendor>;
  return {
    ...draft,
    ...profile,
    id: draft.id,
    name: String(record.businessName ?? record.name ?? draft.name),
    lga: `${String(record.lga)} LGA`,
    tradeCategory: String(profile.tradeCategory ?? record.tradeCategory) as TradeCategory,
    verification: 'unverified',
  };
}
