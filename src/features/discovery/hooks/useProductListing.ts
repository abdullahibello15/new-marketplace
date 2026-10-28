import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { ApiError } from '../../../services/mockApi';
import { getProductListing } from '../services/productCatalogueService';
import type { ProductListing } from '../types';

/** Loads one public product. A 404 becomes `notFound` rather than an error, so the page can say so. */
export function useProductListing(vendorId: string, productId: string) {
  const load = useCallback(
    () =>
    getProductListing(vendorId, productId).catch((e: unknown): ProductListing | null => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    [vendorId, productId]
  );
  const { data, status, error, reload } = useAsyncData(load);
  return { listing: data, notFound: status === 'success' && data === null, status, error, reload };
}
