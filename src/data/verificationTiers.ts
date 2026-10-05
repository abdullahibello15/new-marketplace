import type { Verification, VerificationTierOption } from '../types/marketplace';

export const VERIFICATION = {
  Unverified: 'unverified',
  Id: 'id',
  Trade: 'trade'
} as const satisfies Record<string, Verification>;

/** The verification tiers, lowest to highest. Badges, the search filter and profile popovers all read this list. */
export const verificationTiers: VerificationTierOption[] = [
{
  id: VERIFICATION.Unverified,
  label: 'Unverified',
  description: 'Identity not checked yet',
  explanation: 'This vendor hasn’t completed verification yet. Check their reviews and agree the price before any work starts.'
},
{
  id: VERIFICATION.Id,
  label: 'ID-Verified',
  description: 'Government ID checked by Gwani',
  explanation: 'Gwani has checked this vendor’s government-issued ID, so you know who you’re dealing with. Their trade skills haven’t been assessed yet.'
},
{
  id: VERIFICATION.Trade,
  label: 'Trade-Verified',
  description: 'ID and trade skills checked',
  explanation: 'Gwani has checked this vendor’s government-issued ID and confirmed their trade skills through a certificate or a practical test.'
}];


export function findVerificationTier(id: string | null | undefined): VerificationTierOption | undefined {
  return verificationTiers.find((t) => t.id === id);
}
