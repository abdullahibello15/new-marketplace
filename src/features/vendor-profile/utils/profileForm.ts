import { serviceDurations } from '../../../data/vendorPortal';
import { formatNumberInput } from '../../../lib/numberInput';
import { NEW_SERVICE_ID_PREFIX } from '../constants';
import type { Vendor, VendorProfilePatch } from '../../../types/marketplace';
import type { ProfileFormData, ProfileFormValues, ServiceFormValues } from '../types';

/** 2000 → "2,000", the format price inputs display. */
export const formatPriceInput = formatNumberInput;

export function toFormValues(vendor: Vendor): ProfileFormValues {
  return {
    name: vendor.name,
    tradeCategory: vendor.tradeCategory,
    tradeCategoryOther: vendor.tradeCategoryOther ?? '',
    bio: vendor.bio ?? '',
    gallery: vendor.gallery,
    services: vendor.services.map((s) => ({
      id: s.id,
      name: s.name,
      minPrice: formatPriceInput(s.minPrice),
      maxPrice: formatPriceInput(s.maxPrice),
      duration: s.duration,
      description: s.description ?? '',
      photo: s.photo
    })),
    workingHours: vendor.workingHours,
    serviceAreas: vendor.serviceAreas
  };
}

export function emptyService(): ServiceFormValues {
  return {
    id: `${NEW_SERVICE_ID_PREFIX}${Date.now()}`,
    name: '',
    minPrice: '',
    maxPrice: '',
    duration: serviceDurations[1],
    description: '',
    photo: null
  };
}

export const isNewService = (id: string) => id.startsWith(NEW_SERVICE_ID_PREFIX);

/** Turns validated form data into the profile fields the API stores. Blank optional text becomes undefined. */
export function toProfilePatch(data: ProfileFormData): VendorProfilePatch {
  return {
    name: data.name,
    tradeCategory: data.tradeCategory,
    tradeCategoryOther: data.tradeCategory === 'other' ? data.tradeCategoryOther : undefined,
    bio: data.bio || undefined,
    gallery: data.gallery,
    services: data.services.map((s) => ({ ...s, description: s.description || undefined })),
    workingHours: data.workingHours,
    serviceAreas: data.serviceAreas
  };
}
