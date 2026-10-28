import i18n from '../../../i18n';
import { tradeLabel } from '../../../i18n/labels';
import { nigerLgas } from '../../../data/nigerLgas';
import { tradeCategories } from '../../../data/tradeCategories';
import { addVendor, getAllVendors } from '../../../services/vendorStore';
import { claimNow, claimPath, inviteForToken, invitesSnapshot } from '../../profile-claim/services/claimService';
import { registerVendorContact, vendorContactsSnapshot } from '../../vendor-dashboard/services/associationService';
import { startProviderTrialNow } from '../../vendor-dashboard/services/subscriptionService';
import { buildDraftVendor, uniqueVendorId, type DraftVendorInput } from '../../vendor-profile/utils/draftVendor';
import { PROVIDER_SIGNUP, RIDER_VEHICLES, ROLE, type Role } from '../constants';
import { AuthError } from '../errors';
import type { StoredUser } from '../mock/users';
import type { ClaimSetupInput, RiderSetupInput, VendorSetupInput } from '../types';

/*
 * What each role needs before an account can use it (MOCK backend side): providers get a draft vendor
 * profile (or claim the one their association created), riders a rider profile. Shared by signup and by
 * "add a role" later from the profile.
 */

const invalid = (message: string) => new AuthError('invalid_input', message, 400);

/**
 * One vendor profile per phone number: refuses if this person already has one, if another vendor uses the
 * number, or if an association has already invited this number (then they should claim that profile).
 */
export function assertCanCreateVendor(phone: string, existingVendorId: string | null) {
  if (existingVendorId) throw new AuthError('duplicate_vendor', i18n.t('auth:error.haveVendor'), 409);
  if (vendorContactsSnapshot().some((c) => c.phone === phone)) {
    throw new AuthError('duplicate_vendor', i18n.t('auth:error.phoneHasVendor'), 409);
  }
  const invite = invitesSnapshot().find((i) => i.status === 'invited' && i.profile.phone === phone);
  if (invite) {
    throw new AuthError('invite_exists', i18n.t('auth:error.inviteExists', { association: invite.associationName }), 409, { claimPath: claimPath(invite.token) });
  }
}

function validateVendorSetup(input: VendorSetupInput) {
  if (input.businessName.trim().length < 2 || input.businessName.trim().length > 80) throw invalid(i18n.t('auth:error.businessNameRange'));
  const trade = tradeCategories.find((c) => c.id === input.tradeCategory);
  if (!trade && input.tradeCategory !== 'other') throw invalid(i18n.t('auth:error.chooseTrade'));
  if (trade && trade.kind !== input.kind) throw invalid(i18n.t('auth:error.tradeKindMismatch', { trade: tradeLabel(trade.id), kind: i18n.t(trade.kind === 'retail' ? 'auth:error.kindShop' : 'auth:error.kindService') }));
  if (!nigerLgas.includes(input.lga)) throw invalid(i18n.t('auth:error.chooseLga'));
  if (input.town.trim().length < 2) throw invalid(i18n.t('auth:error.enterTown'));
  if (!input.acceptedTerms) throw invalid(i18n.t('auth:error.acceptTerms'));
}

/** Creates the draft vendor profile and its trial subscription, and makes the user a provider. */
export function applyProviderSetup(user: StoredUser, input: VendorSetupInput, now: Date): StoredUser {
  assertCanCreateVendor(user.phone, user.vendorId);
  validateVendorSetup(input);
  const draft: DraftVendorInput = {
    id: uniqueVendorId(input.businessName, new Set([...getAllVendors().map((v) => v.id), ...invitesSnapshot().map((i) => i.vendorId)])),
    businessName: input.businessName,
    tradeCategory: input.tradeCategory,
    lga: input.lga,
    town: input.town
  };
  const vendor = buildDraftVendor(draft);
  addVendor(vendor);
  registerVendorContact({ vendorId: vendor.id, vendorName: vendor.name, phone: user.phone, email: user.email });
  startProviderTrialNow(vendor.id, PROVIDER_SIGNUP.trialDays, now);
  return withRole({ ...user, vendorId: vendor.id, vendorDraft: draft }, ROLE.Provider);
}

/** Claims the profile a trade association created for this (verified) phone number. */
export function applyClaim(user: StoredUser, input: ClaimSetupInput, now: Date): StoredUser {
  const invite = inviteForToken(input.token);
  if (invite.profile.phone !== user.phone) throw new AuthError('not_allowed', i18n.t('auth:error.invitePhoneMismatch'), 403);
  if (user.vendorId) throw new AuthError('duplicate_vendor', i18n.t('auth:error.haveVendor'), 409);
  const { vendor } = claimNow(input.token, { acceptedTerms: input.acceptedTerms, profile: { businessName: input.businessName, town: input.town, bio: input.bio, yearsExperience: input.yearsExperience } }, now);
  const draft: DraftVendorInput = {
    id: vendor.id,
    businessName: vendor.name,
    tradeCategory: vendor.tradeCategory,
    lga: invite.profile.lga,
    town: input.town || invite.profile.town,
    bio: vendor.about,
    yearsExperience: vendor.yearsExperience,
    serviceAreas: vendor.serviceAreas
  };
  return withRole({ ...user, vendorId: vendor.id, vendorDraft: draft }, ROLE.Provider);
}

export function applyRiderSetup(user: StoredUser, input: RiderSetupInput): StoredUser {
  if (!nigerLgas.includes(input.lga)) throw invalid(i18n.t('auth:error.chooseLga'));
  if (input.town.trim().length < 2) throw invalid(i18n.t('auth:error.enterTown'));
  if (!RIDER_VEHICLES.some((v) => v.id === input.vehicle)) throw invalid(i18n.t('auth:error.chooseVehicle'));
  const plate = input.plateNumber?.trim().toUpperCase() || null;
  if (plate && !/^[A-Z0-9 -]{4,12}$/.test(plate)) throw invalid(i18n.t('auth:error.checkPlate'));
  return withRole({ ...user, rider: { lga: input.lga, town: input.town.trim(), vehicle: input.vehicle, plateNumber: plate } }, ROLE.Rider);
}

/** Adds the role (if new) and makes it the active one. */
export function withRole(user: StoredUser, role: Role): StoredUser {
  return { ...user, roles: user.roles.includes(role) ? user.roles : [...user.roles, role], activeRole: role };
}

/**
 * MOCK only: the vendor directory lives in memory, so after a reload a provider who signed up in this
 * session would have lost their draft profile. Recreate it from what the account stored.
 */
export function restoreProviderProfile(user: StoredUser, now: Date) {
  if (!user.vendorId || !user.vendorDraft) return;
  if (getAllVendors().some((v) => v.id === user.vendorId)) return;
  const vendor = buildDraftVendor(user.vendorDraft);
  addVendor(vendor);
  registerVendorContact({ vendorId: vendor.id, vendorName: vendor.name, phone: user.phone, email: user.email });
  startProviderTrialNow(vendor.id, PROVIDER_SIGNUP.trialDays, now);
}
