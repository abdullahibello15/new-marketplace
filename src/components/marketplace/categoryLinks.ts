import { productCategories } from '../../data/productCategories';
import { productCategoryLabel } from '../../i18n/labels';
import i18n from '../../i18n';
import { PRODUCT_PARAM, PRODUCT_ROUTES, SEARCH_ROUTE } from '../../features/discovery/constants';

export interface CategoryLink {
  key: string;
  to: string;
  label: string;
  /** Whether this link is the page being shown (pathname + the category param). */
  isActive: (pathname: string, params: URLSearchParams) => boolean;
}

/**
 * The header's category row: every product category (from the one shared list), plus all products and
 * services. Labels are read when called, so they follow the language.
 */
export function categoryLinks(): CategoryLink[] {
  const onProducts = (p: string) => p === PRODUCT_ROUTES.list;
  return [
  {
    key: 'all',
    to: PRODUCT_ROUTES.list,
    label: i18n.t('common:market.allProducts'),
    isActive: (p, q) => onProducts(p) && !q.get(PRODUCT_PARAM.Category)
  },
  ...productCategories.map((c) => ({
    key: c.id,
    to: `${PRODUCT_ROUTES.list}?${new URLSearchParams({ [PRODUCT_PARAM.Category]: c.id })}`,
    label: productCategoryLabel(c.id, c.label),
    isActive: (p: string, q: URLSearchParams) => onProducts(p) && q.get(PRODUCT_PARAM.Category) === c.id
  })),
  {
    key: 'services',
    to: SEARCH_ROUTE,
    label: i18n.t('common:market.findServices'),
    isActive: (p) => p === SEARCH_ROUTE
  }];

}
