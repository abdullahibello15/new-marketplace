import { ApiError, mockResponse } from '../../../services/mockApi';
import { vendorAccount } from '../../../data/vendorPortal';
import { isNewService, toProfilePatch } from '../utils/profileForm';
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
    return {
      ...patch,
      services: patch.services?.map((s) => isNewService(s.id) ? { ...s, id: `s-${Date.now()}-${nextServiceId++}` } : s)
    };
  }, 700);
}
