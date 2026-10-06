import { vendors as seedVendors } from '../data/vendors';
import { clampStock } from '../utils/products';
import type { Vendor, VendorProfilePatch } from '../types/marketplace';

/**
 * Mock "database" of vendors that read services (search, feed) query. It starts from the same seed
 * as VendorsContext, and VendorsContext mirrors profile edits into it, so a vendor's saved changes
 * show up in customer search just as they would with a real backend. Changes made by services
 * (e.g. an order reducing stock) are broadcast to subscribers so VendorsContext stays in step.
 * Delete this file when services call a real API.
 */
let rows: Vendor[] = seedVendors;
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
