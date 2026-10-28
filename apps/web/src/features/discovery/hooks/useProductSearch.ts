import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import { searchProducts } from '../services/productCatalogueService';
import { DEFAULT_PRODUCT_FILTERS, countProductFilters, parseProductFilters, productFiltersToSearchString, sameProductFilters } from '../utils/productSearch';
import { usePlace } from './usePlace';
import type { ProductFilters } from '../types';

/**
 * The product list, driven entirely by the URL like vendor search: each filter change is a history
 * entry (Back undoes it) and the address can be shared. Typing in the search box replaces the entry
 * instead, so Back doesn't step through every letter.
 */
export function useProductSearch() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { place } = usePlace();
  const filters = useMemo(() => parseProductFilters(new URLSearchParams(search)), [search]);

  const setFilters = useCallback(
    (next: ProductFilters, { replace = false } = {}) => {
      if (!sameProductFilters(next, filters)) navigate({ search: productFiltersToSearchString(next) }, { replace });
    },
    [filters, navigate]
  );

  const fetchPage = useCallback((page: number) => searchProducts({ filters, placeLga: place.lga, page }), [filters, place.lga]);
  const list = usePaginatedList(fetchPage);

  return {
    filters,
    list,
    setFilters,
    setQuery: (query: string) => setFilters({ ...filters, query }, { replace: true }),
    activeCount: countProductFilters(filters),
    clearAll: () => setFilters({ ...DEFAULT_PRODUCT_FILTERS, query: filters.query, sort: filters.sort })
  };
}
