import i18n from '../../../i18n';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { ADMIN_PERMISSION } from '../../admin/config/roles';
import { requirePermission } from '../../admin/services/adminSession';
import { applicationsSnapshot } from '../../admin/services/verificationService';
import { currentVendorId } from '../../auth/session';
import { findUserByVendorId } from '../../auth/services/authBackend';
import { calculateProfileCompleteness, completenessKindOf } from '../utils/completeness';
import type { Vendor } from '../../../types/marketplace';
import type { CompletenessAccount, CompletenessInput, MyProfileCompleteness } from '../types';

/*
 * Profile completeness (our backend, mocked). The score is never stored: every call computes it from the
 * saved profile (vendor store), the vendor's account (phone, email) and their verification applications,
 * so it can't drift from the data. It is private: the vendor sees their own, admins see it in the
 * verification queue, and search uses it internally as a small ranking boost. Customer-facing responses
 * never include it.
 */

function accountFacts(vendor: Vendor): CompletenessAccount {
  const user = findUserByVendorId(vendor.id);
  return {
    phoneVerified: Boolean(user?.phone && user.phoneVerified),
    emailAdded: Boolean(user?.email),
    // Already verified counts too: their documents were submitted and approved earlier.
    documentsSubmitted: vendor.verification !== 'unverified' || applicationsSnapshot().some((a) => a.vendorId === vendor.id && a.documents.length > 0)
  };
}

function inputFor(vendor: Vendor, account = accountFacts(vendor)): CompletenessInput {
  return {
    kind: completenessKindOf(vendor.tradeCategory),
    profile: {
      photo: vendor.photo,
      name: vendor.name,
      tradeCategory: vendor.tradeCategory,
      tradeCategoryOther: vendor.tradeCategoryOther,
      bio: vendor.bio,
      gallery: vendor.gallery,
      services: vendor.services,
      productCount: vendor.products.length,
      workingHours: vendor.workingHours,
      serviceAreas: vendor.serviceAreas
    },
    account
  };
}

const findVendor = (id: string) => getAllVendors().find((v) => v.id === id);

/** GET /vendor/profile/completeness — the signed-in vendor's own score and checklist. */
export function getMyProfileCompleteness(vendorId: string): Promise<MyProfileCompleteness> {
  return mockResponse(() => {
    if (vendorId !== currentVendorId()) throw new ApiError(i18n.t('vendor:error.ownProfile'), 403);
    const vendor = findVendor(vendorId);
    if (!vendor) throw new ApiError(i18n.t('vendor:profile.notFoundTitle'), 404);
    return profileCompletenessForVendor(vendor, accountFacts(vendor));
  }, 250);
}

/** Completeness from the already-loaded database vendor; does not consult the mock vendor store. */
export function profileCompletenessForVendor(vendor: Vendor, account: CompletenessAccount): MyProfileCompleteness {
  const input = inputFor(vendor, account);
  return { ...calculateProfileCompleteness(input), kind: input.kind, account: input.account };
}

/** Use the API-loaded vendor for live sessions, retaining the store-backed path for demo sessions. */
export function getProfileCompletenessForVendorSession(
  vendorId: string,
  source: { mode: 'live'; vendor: Vendor | undefined; account: CompletenessAccount } | { mode: 'mock' },
): Promise<MyProfileCompleteness> {
  if (source.mode === 'mock') return getMyProfileCompleteness(vendorId);
  if (!source.vendor || source.vendor.id !== vendorId) {
    return Promise.reject(new ApiError(i18n.t('vendor:profile.notFoundTitle'), 404));
  }
  return Promise.resolve(profileCompletenessForVendor(source.vendor, source.account));
}

/** GET /admin/vendors/completeness?ids= — scores for the verification queue. Admins only. */
export function getProfileCompletenessForAdmin(vendorIds: readonly string[]): Promise<Record<string, number>> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.VerificationReview);
    const out: Record<string, number> = {};
    for (const id of new Set(vendorIds)) {
      const vendor = findVendor(id);
      if (vendor) out[id] = calculateProfileCompleteness(inputFor(vendor)).score;
    }
    return out;
  }, 250);
}

/** Server-side only (search ranking). Never return this to a customer-facing caller. */
export const profileCompletenessScore = (vendor: Vendor): number => calculateProfileCompleteness(inputFor(vendor)).score;
