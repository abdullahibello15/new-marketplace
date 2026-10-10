import { vendors as seedVendors } from '../data/vendors';
import { INITIAL_TAKEDOWNS, REMOVED_PHOTO_PLACEHOLDER } from '../data/moderationTakedowns';
import { clampStock } from '../utils/products';
import type { Vendor, VendorProfilePatch, Verification } from '../types/marketplace';

/**
 * Mock "database" of vendors that read services (search, feed) query. It starts from the same seed
 * as VendorsContext, and VendorsContext mirrors profile edits into it, so a vendor's saved changes
 * show up in customer search just as they would with a real backend. Changes made by services
 * (e.g. an order reducing stock) are broadcast to subscribers so VendorsContext stays in step.
 * Delete this file when services call a real API.
 */
/** Content already removed by moderators when the demo starts (see data/moderationTakedowns.ts). */
function withoutTakedowns(list: Vendor[]): Vendor[] {
  return list.map((v) =>
  INITIAL_TAKEDOWNS.filter((t) => t.vendorId === v.id).reduce<Vendor>((acc, t) => {
    if (t.kind === 'profile_photo' && acc.photo === t.targetId) return { ...acc, photo: REMOVED_PHOTO_PLACEHOLDER };
    if (t.kind === 'portfolio_photo') return { ...acc, gallery: acc.gallery.filter((g) => g !== t.targetId) };
    if (t.kind === 'product') return { ...acc, products: acc.products.filter((p) => p.id !== t.targetId) };
    return acc;
  }, v)
  );
}

let rows: Vendor[] = withoutTakedowns(seedVendors);
const listeners = new Set<() => void>();

function commit(next: Vendor[]): void {
  rows = next;
  listeners.forEach((listener) => listener());
}

export function getAllVendors(): readonly Vendor[] {
  return rows;
}

/** Called after every change to the vendor rows. Returns an unsubscribe function. */
export function subscribeVendors(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applyVendorPatch(id: string, patch: VendorProfilePatch): void {
  commit(rows.map((v) => v.id === id ? { ...v, ...patch } : v));
}

/** Admin verification: sets the tier a vendor was approved for. Every badge, card and search filter reads it from here. */
export function setVendorVerification(id: string, verification: Verification): void {
  commit(rows.map((v) => v.id === id ? { ...v, verification } : v));
}

/**
 * Admin moderation: changes a vendor's public content (profile photo, portfolio, products) or the rating
 * recalculated after a review is removed. `update` gets the current row and returns the new one.
 */
export function updateVendor(id: string, update: (vendor: Vendor) => Vendor): void {
  commit(rows.map((v) => v.id === id ? update(v) : v));
}

/** Records a vendor cancelling an accepted job on their profile data. Returns the new count. */
export function incrementVendorCancellations(id: string): number {
  let count = 0;
  commit(
    rows.map((v) => {
      if (v.id !== id) return v;
      count = (v.cancellationCount ?? 0) + 1;
      return { ...v, cancellationCount: count };
    })
  );
  return count;
}

/**
 * Adds `delta` units to each product's stock (negative to take stock), using the same clamping as the
 * vendor's stock stepper. Callers check there's enough before taking stock; see orderService.
 */
export function adjustProductStock(vendorId: string, changes: {productId: string;delta: number;}[]): void {
  commit(
    rows.map((v) =>
    v.id !== vendorId ?
    v :
    {
      ...v,
      products: v.products.map((p) => {
        const delta = changes.filter((c) => c.productId === p.id).reduce((sum, c) => sum + c.delta, 0);
        return delta ? { ...p, stock: clampStock(p.stock + delta) } : p;
      })
    }
    )
  );
}

/** A vendor who has just claimed a profile created by a bulk import: they join the directory now. */
export function addVendor(vendor: Vendor): void {
  if (rows.some((v) => v.id === vendor.id)) return;
  commit([...rows, vendor]);
}
