import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { productCategoryLabel } from '../../../../i18n/labels';
import { ProductImage } from '../../../../components/ProductGrid';
import { StockBadge } from '../../../../components/StockBadge';
import { VerificationBadge } from '../../../../components/VerificationBadge';
import { Price } from '../../../../components/ui/Price';
import { STOCK_STATUS, categoryLabel, getStockStatus } from '../../../../utils/products';
import { AddToCartButton } from '../../../orders/components/cart/AddToCartButton';
import { PRODUCT_ROUTES } from '../../constants';
import type { ProductListing } from '../../types';

/** A product in the catalogue: photo and name link to its page; Add to cart works for guests too. */
export function ProductCard({ listing }: {listing: ProductListing;}) {
  const { t } = useTranslation('discovery');
  const { product: p, shop } = listing;
  const href = PRODUCT_ROUTES.detail(shop.id, p.id);
  const status = getStockStatus(p);
  const soldOut = status === STOCK_STATUS.out;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <Link to={href} tabIndex={-1} aria-hidden="true" className="relative block overflow-hidden">
        <ProductImage key={p.images[0]} src={p.images[0]} dimmed={soldOut || !!shop.unavailable} />
        {soldOut && <StockBadge product={p} className="absolute left-2 top-2" />}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-xs font-semibold text-muted">{productCategoryLabel(p.category, categoryLabel(p.category))}</p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-bold text-ink">
          <Link to={href} className="rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">{p.name}</Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span className="truncate">{shop.name}</span>
          {shop.verification !== 'unverified' && <VerificationBadge verification={shop.verification} />}
        </p>
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 pt-2">
          <p className="font-extrabold text-ink"><Price amount={p.price} /></p>
          {shop.unavailable ?
          <p className="text-xs font-bold text-clay-dark">{t('products.shopUnavailable')}</p> :
          status === STOCK_STATUS.low ?
          <p className="text-xs font-bold text-mustard-dark">{t('common:stock.onlyLeft', { count: p.stock })}</p> :
          null}
        </div>
        <div className="pt-3"><AddToCartButton vendor={shop} product={p} /></div>
      </div>
    </article>);

}
