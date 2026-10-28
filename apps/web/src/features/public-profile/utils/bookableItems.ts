import { BOOKABLE_ITEM_TYPE } from '../constants';
import type { Vendor } from '../../../types/marketplace';
import type { BookableItem } from '../types';

/** The vendor's services, plus products a customer can actually order (shown, photographed and in stock). */
export function bookableItems(vendor: Vendor): BookableItem[] {
  return [
  ...vendor.services.map((s): BookableItem => ({
    id: s.id,
    type: BOOKABLE_ITEM_TYPE.Service,
    name: s.name,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice
  })),
  ...vendor.products.
  filter((p) => p.available && p.images.length > 0 && p.stock > 0).
  map((p): BookableItem => ({ id: p.id, type: BOOKABLE_ITEM_TYPE.Product, name: p.name, minPrice: p.price, maxPrice: p.price }))];

}
