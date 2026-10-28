import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { searchVendorsForMap } from '../services/discoveryService';
import type { Place, VendorMapResult, VendorSearchParams } from '../types';

const NOTHING: VendorMapResult = { pins: [], missingLocation: 0 };

/**
 * Every vendor matching the filters, for the map. Only fetches while the map is showing.
 * `criteria` must be stable (memoised on the URL), or this refetches on every render.
 */
export function useVendorMapPins(criteria: Omit<VendorSearchParams, 'place' | 'page' | 'pageSize'>, place: Place, enabled: boolean) {
  const load = useCallback(
    () => enabled ? searchVendorsForMap({ ...criteria, place }) : Promise.resolve(NOTHING),
    [criteria, place, enabled]
  );
  const { data, status, error, reload } = useAsyncData(load);
  return { result: data ?? NOTHING, status, error, reload, hasData: data !== null };
}
