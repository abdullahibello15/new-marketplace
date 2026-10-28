import i18n from '../../../i18n';
import { planLimitWords, planName } from '../../../i18n/labels';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { isNewService, toProfilePatch } from '../utils/profileForm';
import { PLAN_LIMIT_LABELS } from '../../vendor-dashboard/plans';
import { currentPlanFor } from '../../vendor-dashboard/services/subscriptionService';
import type { VendorProfilePatch } from '../../../types/marketplace';
import type { ProfileFormData } from '../types';
import { currentVendorId } from '../../auth/session';

let nextServiceId = 1;

/**
 * PUT /vendor/profile
 * Resolves with the profile fields as the API stored them (new services get real ids).
 * The caller writes them into the app's vendor store so public pages update too.
 */
export function saveVendorProfile(vendorId: string, data: ProfileFormData): Promise<VendorProfilePatch> {
  return mockResponse(() => {
    if (vendorId !== currentVendorId()) throw new ApiError(i18n.t('vendor:error.ownProfile'), 403);
    const patch = toProfilePatch(data);
    const plan = currentPlanFor(vendorId);
    const over = plan && ([['portfolioPhotos', data.gallery.length], ['services', data.services.length]] as const).find(([key, count]) => {
      const limit = plan.limits[key];
      return limit !== null && count > limit;
    });
    if (plan && over) {
      throw new ApiError(i18n.t('vendor:error.planLimit', { plan: planName(plan.id, plan.name), what: planLimitWords(over[0], plan.limits[over[0]] ?? 0, PLAN_LIMIT_LABELS[over[0]].many) }), 403);
    }
    return {
      ...patch,
      services: patch.services?.map((s) => isNewService(s.id) ? { ...s, id: `s-${Date.now()}-${nextServiceId++}` } : s)
    };
  }, 700);
}
