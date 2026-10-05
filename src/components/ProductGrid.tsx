import { useState } from 'react';
import { ImageOffIcon, ImagesIcon } from 'lucide-react';
import { Lightbox } from './Lightbox';
import { StockBadge } from './StockBadge';
import { Price } from './ui/Price';
import { STOCK_STATUS, categoryLabel, getStockStatus } from '../utils/products';
import type { Product } from '../types/marketplace';

/** Imported image links can go stale; show a neutral tile instead of the browser's broken-image icon. */
function ProductImage({ src, dimmed }: {src: string;dimmed: boolean;}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex aspect-square w-full items-center justify-center bg-sand text-muted">
        <ImageOffIcon className="h-7 w-7" aria-hidden="true" />
      </span>);

  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={`aspect-square w-full object-cover transition-transform duration-200 ease-out hover:scale-[1.03] ${dimmed ? 'opacity-60' : ''}`} />);


}

/** Public shop grid. Hidden products (and any without a photo) never show. */
export function ProductGrid({ products }: {products: Product[];}) {
  const [open, setOpen] = useState<{product: Product;index: number;} | null>(null);
  const visible = products.filter((p) => p.available && p.images.length > 0);
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="products-heading">
      <h2 id="products-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
        Products · {visible.length}
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((p) => {
          const status = getStockStatus(p);
          const soldOut = status === STOCK_STATUS.out;
          return (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
              <button
                type="button"
                onClick={() => setOpen({ product: p, index: 0 })}
                aria-label={`View photos of ${p.name}`}
                className="relative block overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pine">

                <ProductImage key={p.images[0]} src={p.images[0]} dimmed={soldOut} />
                {soldOut && <StockBadge product={p} className="absolute left-2 top-2" />}

                {p.images.length > 1 &&
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-ink/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    <ImagesIcon className="h-3 w-3" aria-hidden="true" />
                    {p.images.length}
                  </span>
                }
              </button>
              <div className="flex flex-1 flex-col p-3">
                <p className="text-xs font-semibold text-muted">{categoryLabel(p.category)}</p>
                <h3 className="mt-0.5 line-clamp-2 text-sm font-bold text-ink">{p.name}</h3>
                {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{p.description}</p>}
                <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 pt-2">
                  <p className="font-extrabold text-ink">
                    <Price amount={p.price} />
                  </p>
                  {soldOut ?
                  <p className="text-xs font-bold text-clay-dark">Can’t be ordered</p> :
                  status === STOCK_STATUS.low ?
                  <p className="text-xs font-bold text-mustard-dark">Only {p.stock} left</p> :
                  null}
                </div>
              </div>
            </li>);

        })}
      </ul>
      <Lightbox
        photos={open?.product.images ?? []}
        index={open ? open.index : null}
        onIndexChange={(index) => setOpen((prev) => prev && { ...prev, index })}
        onClose={() => setOpen(null)}
        altPrefix={open?.product.name ?? 'Product'} />

    </section>);

}
