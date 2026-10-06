import { serviceDurations } from '../../../data/vendorPortal';
import { formatNumberInput } from '../../../lib/numberInput';
import { NEW_SERVICE_ID_PREFIX } from '../constants';
import { fulfilmentFor } from '../../orders/utils/fulfilment';
import type { Vendor, VendorFulfilment, VendorProfilePatch } from '../../../types/marketplace';
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
    serviceAreas: vendor.serviceAreas,
    fulfilment: toFulfilmentValues(fulfilmentFor(vendor)),
    acceptsCash: vendor.acceptsCash !== false
  };
}

function toFulfilmentValues(f: VendorFulfilment): ProfileFormValues['fulfilment'] {
  return {
    pickupEnabled: f.pickup.enabled,
    pickupAddress: f.pickup.address,
    pickupInstructions: f.pickup.instructions,
    deliveryEnabled: f.delivery.enabled,
    deliveryFee: formatPriceInput(f.delivery.fee),
    deliveryAreas: f.delivery.areas
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
    serviceAreas: data.serviceAreas,
    fulfilment: {
      pickup: { enabled: data.fulfilment.pickupEnabled, address: data.fulfilment.pickupAddress, instructions: data.fulfilment.pickupInstructions },
      delivery: { enabled: data.fulfilment.deliveryEnabled, fee: data.fulfilment.deliveryFee, areas: data.fulfilment.deliveryAreas }
    },
    acceptsCash: data.acceptsCash
  };
}
