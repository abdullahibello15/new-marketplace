import { vendors as seedVendors } from '../data/vendors';
import type { Vendor, VendorProfilePatch } from '../types/marketplace';

/**
 * Mock "database" of vendors that read services (search, feed) query. It starts from the same seed
 * as VendorsContext, and VendorsContext mirrors profile edits into it, so a vendor's saved changes
 * show up in customer search just as they would with a real backend.
 * Delete this file when services call a real API.
 */
let rows: Vendor[] = seedVendors;

export function getAllVendors(): readonly Vendor[] {
  return rows;
}

export function applyVendorPatch(id: string, patch: VendorProfilePatch): void {
  rows = rows.map((v) => v.id === id ? { ...v, ...patch } : v);
}
