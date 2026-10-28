import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { ApiError } from '../../../services/mockApi';
import { getVendorProfile } from '../services/publicProfileService';
import type { PublicVendorProfile } from '../types';

/** Loads a vendor's public profile. A 404 becomes `notFound` rather than an error, so the page can say so. */
export function useVendorProfile(vendorId: string) {
  const load = useCallback(
    () =>
    getVendorProfile(vendorId).catch((e: unknown): PublicVendorProfile | null => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    [vendorId]
  );
  const { data, status, error, reload } = useAsyncData(load);
  return { profile: data, notFound: status === 'success' && data === null, status, error, reload };
}
