import { BIO_MAX_LENGTH } from '../../../data/tradeCategories';

/*
 * Bulk vendor import (trade-association partnerships): the ONE place for its limits and options.
 * ⚠️ PLACEHOLDER values: confirm against the build spec.
 */
export const VENDOR_IMPORT = {
  /** Most vendors in one file. PLACEHOLDER */
  maxRows: 200,
  /** Biggest file accepted. PLACEHOLDER */
  maxBytes: 1024 * 1024,
  /** Rows sent to the server per request while importing (progress moves per batch). */
  batchSize: 5,
  /** How long a "claim your profile" link works. PLACEHOLDER */
  inviteValidDays: 30,
  bioMaxLength: BIO_MAX_LENGTH,
  nameMaxLength: 80,
  maxYearsExperience: 70
} as const;

/**
 * Where imported vendors start on verification. The build spec's tiers are Unverified, ID-Verified and
 * Trade-Verified (data/verificationTiers.ts). ⚠️ It has NO "Association-vouched" tier, so that option is
 * shown but can't be chosen until the spec adds one; everyone starts Unverified and the import records
 * which association vouched for them.
 */
export const IMPORT_TIER_OPTIONS = [
{ id: 'unverified', label: 'Unverified', available: true, note: 'The build spec’s lowest tier. Members verify their ID and trade as usual after claiming.' },
{
  id: 'association_vouched',
  label: 'Association-vouched',
  available: false,
  note: 'Not a tier in the build spec (Unverified, ID-Verified, Trade-Verified). Needs a spec decision before it can be used.'
}] as
const;

export type ImportTierHandling = (typeof IMPORT_TIER_OPTIONS)[number]['id'];

export const INVITE_METHOD_LABELS = {
  sms: 'SMS',
  email: 'Email',
  none: 'Don’t send (I’ll share links myself)'
} as const;

export type InviteMethod = keyof typeof INVITE_METHOD_LABELS;

/** The consent statement the admin must confirm before uploading members' details. */
export const CONSENT_TEXT =
'I confirm the partner association has its members’ consent to share these details with Gwani so we can create their profiles and invite them.';

/** MOCK server behaviour, so failed rows can be tried: creating a vendor whose phone ends in this fails. */
export const MOCK_IMPORT = { failingPhoneSuffix: '0000' } as const;
