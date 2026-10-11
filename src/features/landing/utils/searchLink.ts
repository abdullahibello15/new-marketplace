import { SEARCH_ROUTE } from '../../discovery/constants';
import { DEFAULT_FILTERS, filtersToSearchString } from '../../discovery/utils/searchFilters';
import type { NigerLga, TradeCategory } from '../../../types/marketplace';

/** The search a visitor picked on the landing page, as the results URL they'll see once they have an account. */
export function landingSearchUrl(category: TradeCategory | '', lga: NigerLga | ''): string {
  const filters = {
    ...DEFAULT_FILTERS,
    categories: category ? [category] : [],
    area: lga ? { mode: 'lga' as const, lgas: [lga] } : DEFAULT_FILTERS.area
  };
  return `${SEARCH_ROUTE}${filtersToSearchString(filters)}`;
}
