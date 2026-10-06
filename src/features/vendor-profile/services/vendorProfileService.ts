import { ApiError, mockResponse } from '../../../services/mockApi';
import { vendorAccount } from '../../../data/vendorPortal';
import { isNewService, toProfilePatch } from '../utils/profileForm';
import { PLAN_LIMIT_LABELS } from '../../vendor-dashboard/plans';
import { currentPlanFor } from '../../vendor-dashboard/services/subscriptionService';
import type { VendorProfilePatch } from '../../../types/marketplace';
import type { ProfileFormData } from '../types';

let nextServiceId = 1;

/**
 * PUT /vendor/profile
 * Resolves with the profile fields as the API stored them (new services get real ids).
 * The caller writes them into the app's vendor store so public pages update too.
 */
export function saveVendorProfile(vendorId: string, data: ProfileFormData): Promise<VendorProfilePatch> {
  return mockResponse(() => {
    if (vendorId !== vendorAccount.vendorId) throw new ApiError('You can only edit your own profile.', 403);
    const patch = toProfilePatch(data);
    const plan = currentPlanFor(vendorId);
    const over = plan && ([['portfolioPhotos', data.gallery.length], ['services', data.services.length]] as const).find(([key, count]) => {
      const limit = plan.limits[key];
      return limit !== null && count > limit;
    });
    if (plan && over) {
      throw new ApiError(`Your ${plan.name} plan allows ${plan.limits[over[0]]} ${PLAN_LIMIT_LABELS[over[0]].many}. Remove some or upgrade your plan.`, 403);
    }
    return {
      ...patch,
      services: patch.services?.map((s) => isNewService(s.id) ? { ...s, id: `s-${Date.now()}-${nextServiceId++}` } : s)
    };
  }, 700);
}
