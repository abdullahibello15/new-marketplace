import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import { searchVendors } from '../services/discoveryService';
import {
  activeFilterChips,
  clearFilters,
  countActiveFilters,
  filtersToSearchString,
  parseFilters,
  sameFilters,
  withSort,
  withView } from
'../utils/searchFilters';
import { usePlace } from './usePlace';
import { RESULTS_VIEW } from '../constants';
import type { ResultsView, SearchFilters, SortOption } from '../types';

/**
 * Search results driven entirely by the URL. Each filter change pushes a history entry, so Back
 * undoes it, and the address bar can be shared as-is.
 */
export function useSearchResults() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { place } = usePlace();
  // Re-parse only when the URL actually changes, so `filters` stays stable for the fetch below.
  const filters = useMemo(() => parseFilters(new URLSearchParams(search)), [search]);

  const setFilters = useCallback(
    (next: SearchFilters) => {
      // A push (not replace), so Back steps through filter changes.
      if (!sameFilters(next, filters)) navigate({ search: filtersToSearchString(next) });
    },
    [filters, navigate]
  );

  // What the data depends on: every filter except list/map view, so switching view doesn't refetch.
  const criteriaKey = filtersToSearchString(withView(filters, RESULTS_VIEW.List));
  const criteria = useMemo(() => parseFilters(new URLSearchParams(criteriaKey)), [criteriaKey]);

  const fetchPage = useCallback((page: number) => searchVendors({ ...criteria, place, page }), [criteria, place]);
  const list = usePaginatedList(fetchPage);

  return {
    filters,
    criteria,
    list,
    setFilters,
    setSort: (sort: SortOption) => setFilters(withSort(filters, sort)),
    setView: (view: ResultsView) => setFilters(withView(filters, view)),
    clearAll: () => setFilters(clearFilters(filters)),
    activeCount: countActiveFilters(filters),
    chips: activeFilterChips(filters)
  };
}
