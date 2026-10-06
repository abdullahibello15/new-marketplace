import { FULFILMENT_METHOD } from '../constants';
import type { NigerLga, Vendor, VendorFulfilment } from '../../../types/marketplace';
import type { FulfilmentMethod } from '../types';

/**
 * A vendor's pickup and delivery options. Vendors who haven't set them up yet offer pickup only, from
 * their listed area, so customers can still order.
 */
export function fulfilmentFor(vendor: Pick<Vendor, 'name' | 'lga' | 'fulfilment'>): VendorFulfilment {
  return (
    vendor.fulfilment ?? {
      pickup: { enabled: true, address: `${vendor.name}, ${vendor.lga}`, instructions: 'Message the vendor for the exact pickup spot.' },
      delivery: { enabled: false, fee: 0, areas: [] }
    });

}

/** Enabled methods, delivery first when both are on (it's what most customers pick). */
export function enabledMethods(f: VendorFulfilment): FulfilmentMethod[] {
  return [
  ...(f.delivery.enabled ? [FULFILMENT_METHOD.Delivery] : []),
  ...(f.pickup.enabled ? [FULFILMENT_METHOD.Pickup] : [])];

}

/** Why this vendor can't deliver to `lga`, or null if they can. */
export function deliveryBlockedReason(f: VendorFulfilment, vendorName: string, lga: NigerLga | null): string | null {
  if (!f.delivery.enabled) return `${vendorName} doesn’t deliver. Choose pickup.`;
  if (!lga) return null;
  if (!f.delivery.areas.includes(lga)) {
    return `${vendorName} doesn’t deliver to ${lga} LGA. They deliver to ${listAreas(f.delivery.areas)}. Choose pickup or change the address.`;
  }
  return null;
}

/** "Bosso, Chanchaga and Paikoro" */
export function listAreas(areas: readonly string[]): string {
  if (areas.length <= 1) return areas[0] ?? 'no areas yet';
  return `${areas.slice(0, -1).join(', ')} and ${areas[areas.length - 1]}`;
}

/** The fee this order pays for the chosen method. */
export const feeFor = (f: VendorFulfilment, method: FulfilmentMethod) => method === FULFILMENT_METHOD.Delivery ? f.delivery.fee : 0;
