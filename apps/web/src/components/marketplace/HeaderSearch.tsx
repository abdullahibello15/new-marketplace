import { useTranslation } from 'react-i18next';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { sanitizeText } from '../../lib/sanitize';
import { PRODUCT_ROUTES, QUERY_MAX_LENGTH, SEARCH_PARAM, SEARCH_ROUTE } from '../../features/discovery/constants';
import { parseProductFilters, productFiltersToSearchString } from '../../features/discovery/utils/productSearch';

type Scope = 'products' | 'services';

/**
 * The big search in the marketplace header: products (the catalogue) or services (vendor search).
 * On the product list it keeps the other filters and only changes the search text.
 */
export function HeaderSearch() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const scopeId = useId();
  const onServices = pathname === SEARCH_ROUTE;
  const urlQuery = pathname === PRODUCT_ROUTES.list || onServices ? new URLSearchParams(search).get(SEARCH_PARAM.Query) ?? '' : '';
  const [scope, setScope] = useState<Scope>(onServices ? 'services' : 'products');
  const [text, setText] = useState(urlQuery);

  // Follow the page: a new search, Back/Forward, or leaving the results clears or refills the box.
  useEffect(() => setText(urlQuery), [urlQuery]);
  useEffect(() => {
    if (onServices) setScope('services');else
    if (pathname === PRODUCT_ROUTES.list) setScope('products');
  }, [pathname, onServices]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const query = sanitizeText(text).slice(0, QUERY_MAX_LENGTH);
    if (scope === 'services') {
      navigate(query ? `${SEARCH_ROUTE}?${new URLSearchParams({ [SEARCH_PARAM.Query]: query })}` : SEARCH_ROUTE);
      return;
    }
    const current = pathname === PRODUCT_ROUTES.list ? parseProductFilters(new URLSearchParams(search)) : parseProductFilters(new URLSearchParams());
    navigate(`${PRODUCT_ROUTES.list}${productFiltersToSearchString({ ...current, query })}`);
  }

  return (
    <form role="search" onSubmit={submit} className="flex w-full items-stretch overflow-hidden rounded-xl bg-white text-ink ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-mustard">
      <label htmlFor={scopeId} className="sr-only">{t('market.searchIn')}</label>
      <select
        id={scopeId}
        value={scope}
        onChange={(e) => setScope(e.target.value === 'services' ? 'services' : 'products')}
        className="shrink-0 border-0 border-r border-line bg-sand py-2.5 pl-3 pr-7 text-sm font-semibold text-ink focus:outline-none focus:ring-0">

        <option value="products">{t('market.scopeProducts')}</option>
        <option value="services">{t('market.scopeServices')}</option>
      </select>
      <label className="min-w-0 flex-1">
        <span className="sr-only">{t('market.searchLabel')}</span>
        <input
          type="search"
          value={text}
          maxLength={QUERY_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          placeholder={scope === 'services' ? t('market.searchPlaceholderServices') : t('market.searchPlaceholderProducts')}
          className="h-full w-full border-0 bg-white px-3 py-2.5 text-[15px] placeholder:text-muted focus:outline-none focus:ring-0" />

      </label>
      <button type="submit" className="flex shrink-0 items-center gap-2 bg-mustard px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-[#c99a2a] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/40">
        <SearchIcon className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">{t('market.searchButton')}</span>
        <span className="sr-only sm:hidden">{t('market.searchButton')}</span>
      </button>
    </form>);

}
