import type { NigerLga, TradeCategory } from '../../types/marketplace';

export type InviteStatus = 'invited' | 'claimed' | 'revoked';
export type InviteChannel = 'sms' | 'email';

/** The profile details a partner sent for a member, before the vendor claims and checks them. */
export interface DraftProfile {
  fullName: string;
  businessName: string;
  /** E.164, e.g. +2348031234567. */
  phone: string;
  email: string | null;
  tradeCategory: TradeCategory;
  lga: NigerLga;
  town: string;
  yearsExperience: number | null;
  bio: string;
  serviceAreas: NigerLga[];
}

/** One message sent with the claim link (MOCK: nothing really leaves the app). */
export interface InviteMessage {
  channel: InviteChannel;
  /** Masked phone or the email address. */
  to: string;
  text: string;
  at: string;
  /** Who sent it: the import, or the admin who resent it. */
  by: string;
}

/**
 * A draft vendor profile created by a bulk import, waiting to be claimed. Until it's claimed the vendor
 * isn't in the directory at all, so they can't be found, booked or ordered from (status "Invited").
 */
export interface VendorInvite {
  id: string;
  /** The vendor id their profile gets once claimed (reserved now so membership and history line up). */
  vendorId: string;
  /** Secret part of the claim link. */
  token: string;
  status: InviteStatus;
  profile: DraftProfile;
  importId: string;
  associationId: string;
  associationName: string;
  /** When their bundle membership starts (the import's start date). */
  startsOn: string;
  createdAt: string;
  expiresAt: string;
  messages: InviteMessage[];
  claimedAt: string | null;
  revokedAt: string | null;
}

/** What the claim page shows: the draft, without the token. */
export type ClaimView = Pick<VendorInvite, 'status' | 'profile' | 'associationName' | 'expiresAt' | 'startsOn'> & {expired: boolean;};

/** Sign-in is the phone number, verified with a one-time code by the auth service before claiming. */
export interface ClaimInput {
  /** What they corrected while checking their details. */
  profile: Pick<DraftProfile, 'businessName' | 'bio' | 'town' | 'yearsExperience'>;
  acceptedTerms: boolean;
}
