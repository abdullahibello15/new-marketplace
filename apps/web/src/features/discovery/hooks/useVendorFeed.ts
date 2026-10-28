import { useCallback } from 'react';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import { searchVendors } from '../services/discoveryService';
import { usePlace } from './usePlace';

/** "Near you" feed: vendors nearest the selected place, a page at a time. Resets when the place changes. */
export function useVendorFeed() {
  const { place } = usePlace();
  const fetchPage = useCallback((page: number) => searchVendors({ place, page }), [place]);
  return usePaginatedList(fetchPage);
}
