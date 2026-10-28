import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PackageXIcon, StoreIcon } from 'lucide-react';
import { productCategoryLabel } from '../../../i18n/labels';
import { Lightbox } from '../../../components/Lightbox';
import { ProductImage } from '../../../components/ProductGrid';
import { StockBadge } from '../../../components/StockBadge';
import { VerificationBadge } from '../../../components/VerificationBadge';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { Price } from '../../../components/ui/Price';
import { STOCK_STATUS, categoryLabel, getStockStatus } from '../../../utils/products';
import { AddToCartButton } from '../../orders/components/cart/AddToCartButton';
import { ReviewsSection } from '../../public-profile/components/reviews/ReviewsSection';
import { VendorRating } from '../components/listings/VendorRating';
import { PRODUCT_PARAM, PRODUCT_ROUTES } from '../constants';
import { useProductListing } from '../hooks/useProductListing';
import type { ProductCategory } from '../../../types/marketplace';

const crumbLink = 'rounded hover:text-ink hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40';

function Breadcrumb({ category, name }: {category?: ProductCategory;name?: string;}) {
  const { t } = useTranslation('discovery');
  return (
    <nav aria-label={t('products.breadcrumb')} className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><Link to="/" className={crumbLink}>{t('profile.home')}</Link></li>
        <li aria-hidden="true">›</li>
        <li><Link to={PRODUCT_ROUTES.list} className={crumbLink}>{t('products.backToShop')}</Link></li>
        {category &&
        <>
            <li aria-hidden="true">›</li>
            <li>
              <Link to={`${PRODUCT_ROUTES.list}?${new URLSearchParams({ [PRODUCT_PARAM.Category]: category })}`} className={crumbLink}>
                {productCategoryLabel(category, categoryLabel(category))}
              </Link>
            </li>
          </>
        }
        {name &&
        <>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="max-w-[16rem] truncate font-semibold text-ink">{name}</li>
          </>
        }
      </ol>
    </nav>);

}

/**
 * /products/:vendorId/:productId — photos on the left; name, price, stock and Add to cart on the right;
 * the description and reviews below. Products don't have reviews of their own, so these are the shop's
 * (labelled so). Public.
 */
export function ProductDetailSection() {
  const { t } = useTranslation('discovery');
  const { vendorId = '', productId = '' } = useParams();
  const { listing, notFound, status, error, reload } = useProductListing(vendorId, productId);
  const [photo, setPhoto] = useState<number | null>(null);
  const [shown, setShown] = useState(0);

  if (status === 'error') {
    return (
      <PageContainer className="space-y-5">
        <Breadcrumb />
        <ErrorState message={error ?? ''} onRetry={reload} />
      </PageContainer>);

  }
  if (notFound) {
    return (
      <PageContainer className="space-y-5">
        <Breadcrumb />
        <EmptyState
          icon={PackageXIcon}
          title={t('products.notFoundTitle')}
          description={t('products.notFoundText')}
          action={<Link to={PRODUCT_ROUTES.list} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>{t('products.browseAll')}</Link>} />

      </PageContainer>);

  }
  if (!listing) {
    return (
      <PageContainer className="space-y-5">
        <Breadcrumb />
        <LoadingState label={t('products.loading')} rows={2} rowClassName="h-40" />
      </PageContainer>);

  }

  const { product: p, shop } = listing;
  const stock = getStockStatus(p);
  const current = p.images[Math.min(shown, p.images.length - 1)];

  return (
    <PageContainer className="space-y-8 lg:space-y-10">
      <Breadcrumb category={p.category} name={p.name} />

      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        <section aria-label={t('products.photos')} className="md:sticky md:top-24 md:self-start lg:top-32">
          <button
            type="button"
            onClick={() => setPhoto(shown)}
            aria-label={t('common:photos.viewPhotosOf', { name: p.name })}
            className="relative block w-full overflow-hidden rounded-2xl border border-line bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pine">

            <ProductImage key={current} src={current} dimmed={stock === STOCK_STATUS.out} />
          </button>
          {p.images.length > 1 &&
          <ul className="mt-3 grid grid-cols-5 gap-2">
              {p.images.map((src, i) =>
            <li key={src}>
                  <button
                type="button"
                onClick={() => setShown(i)}
                aria-label={t('products.photoN', { n: i + 1, total: p.images.length })}
                aria-pressed={i === shown}
                className={`block w-full overflow-hidden rounded-xl border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine ${i === shown ? 'border-pine' : 'border-line'}`}>

                    <img src={src} alt="" className="aspect-square w-full object-cover" />
                  </button>
                </li>
            )}
            </ul>
          }
        </section>

        <section aria-labelledby="product-title" className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">{productCategoryLabel(p.category, categoryLabel(p.category))}</p>
            <h1 id="product-title" className="mt-1 text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">{p.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Link to={`/vendors/${encodeURIComponent(shop.id)}`} className="font-semibold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">{shop.name}</Link>
              <VerificationBadge verification={shop.verification} />
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-3xl font-extrabold text-ink"><Price amount={p.price} /></p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StockBadge product={p} />
              {stock === STOCK_STATUS.low && <span className="text-sm font-bold text-mustard-dark">{t('common:stock.onlyLeft', { count: p.stock })}</span>}
            </div>
            {shop.unavailable && <p role="note" className="mt-3 text-sm font-semibold text-clay-dark">{t('products.shopUnavailable')}</p>}
            <div className="mt-4"><AddToCartButton vendor={shop} product={p} /></div>
            <p className="mt-3 text-xs text-muted">{t('products.checkoutNote')}</p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{t('products.soldBy')}</h2>
            <p className="mt-2 text-lg font-bold text-ink">{shop.name}</p>
            <div className="mt-1"><VendorRating rating={shop.rating} reviews={shop.reviews} /></div>
            <Link to={`/vendors/${encodeURIComponent(shop.id)}`} className={`${buttonClasses({ variant: 'secondary', size: 'sm' })} mt-4`}>
              <StoreIcon className="h-4 w-4" aria-hidden="true" />
              {t('products.visitShop')}
            </Link>
          </div>
        </section>
      </div>

      <section aria-labelledby="product-description" className="border-t border-line pt-8">
        <h2 id="product-description" className="text-lg font-extrabold text-ink">{t('products.description')}</h2>
        <p className="mt-3 max-w-3xl whitespace-pre-line text-[15px] text-ink">{p.description || t('products.noDescription')}</p>
      </section>

      <div className="border-t border-line pt-8">
        <p className="mb-4 text-sm text-muted">{t('products.shopReviewsNote', { name: shop.name })}</p>
        <ReviewsSection vendorId={shop.id} vendorName={shop.name} />
      </div>

      <Lightbox photos={p.images} index={photo} onIndexChange={setPhoto} onClose={() => setPhoto(null)} altPrefix={p.name} />
    </PageContainer>);

}
