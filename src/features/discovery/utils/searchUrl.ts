import { SEARCH_ROUTE } from '../constants';
import { DEFAULT_FILTERS, filtersToSearchString } from './searchFilters';
import type { SearchTarget } from '../types';

/** URL for a suggestion, recent search or category tile: a fresh search with just that one thing set. */
export function buildSearchUrl(target: SearchTarget): string {
  const filters =
  target.kind === 'category' ? { ...DEFAULT_FILTERS, categories: [target.category] } : { ...DEFAULT_FILTERS, query: target.query };
  return `${SEARCH_ROUTE}${filtersToSearchString(filters)}`;
}
