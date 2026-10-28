import i18n from '../../../i18n';
import { productCategoryLabel } from '../../../i18n/labels';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { categoryLabel } from '../../../utils/products';
import { isVendorPublic } from '../../auth/services/authBackend';
import { withListingRestrictions } from '../../vendor-dashboard/services/subscriptionService';
import { PRODUCT_PAGE_SIZE } from '../constants';
import { isPublicProduct, matchProducts } from '../utils/productSearch';
import type { Vendor } from '../../../types/marketplace';
import type { Page } from '../../../types/pagination';
import type { ProductFilters, ProductListing, ProductShop } from '../types';

/*
 * The public product catalogue: every listed shop's public products. Open to guests (no sign-in), like
 * vendor search; adding to the cart is local, and checkout is where an account is needed.
 */

const toShop = (v: Vendor): ProductShop => ({
  id: v.id,
  name: v.name,
  lga: v.lga,
  verification: v.verification,
  rating: v.rating,
  reviews: v.reviews,
  unavailable: v.unavailable ?? null,
  serviceAreas: v.serviceAreas
});

/** Listed shops as customers see them (a suspended shop is marked unavailable, so it can't take orders). */
function allListings(): ProductListing[] {
  return getAllVendors().
  filter((v) => isVendorPublic(v.id) && v.products.length > 0).
  flatMap((v) => {
    const shop = toShop(withListingRestrictions(v));
    return v.products.map((product) => ({ product, shop }));
  });
}

const localCategoryLabel = (id: Parameters<typeof categoryLabel>[0]) => productCategoryLabel(id, categoryLabel(id));

/**
 * GET /products?q=&category=&min=&max=&inStock=&sort=&lga=&page=&pageSize=
 * `placeLga` ranks shops serving the selected place first under the Recommended sort.
 */
export function searchProducts({
  filters,
  placeLga = null,
  page,
  pageSize = PRODUCT_PAGE_SIZE
}: {filters: ProductFilters;placeLga?: string | null;page: number;pageSize?: number;}): Promise<Page<ProductListing>> {
  return mockResponse(() => {
    const matches = matchProducts(allListings(), filters, { placeLga, categoryLabel: localCategoryLabel });
    const start = (page - 1) * pageSize;
    return { items: matches.slice(start, start + pageSize), page, pageSize, total: matches.length, hasMore: start + pageSize < matches.length };
  });
}

/** GET /products/:vendorId/:productId — one public product and its shop, or 404. */
export function getProductListing(vendorId: string, productId: string): Promise<ProductListing> {
  return mockResponse(() => {
    const found = allListings().find((l) => l.shop.id === vendorId && l.product.id === productId);
    if (!found || !isPublicProduct(found.product)) throw new ApiError(i18n.t('discovery:products.errors.notFound'), 404);
    return found;
  });
}
