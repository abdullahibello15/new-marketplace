import { STOCK_STATUS, getStockStatus } from '../utils/products';
import type { Product, StockStatus } from '../types/marketplace';

const BADGES: Partial<Record<StockStatus, {label: string;className: string;dotClass: string;}>> = {
  [STOCK_STATUS.low]: { label: 'Low stock', className: 'bg-[#FBF3DC] text-mustard-dark', dotClass: 'bg-mustard-dark' },
  [STOCK_STATUS.out]: { label: 'Out of stock', className: 'bg-clay-soft text-clay-dark', dotClass: 'bg-clay-dark' }
};

/** Renders nothing when stock is healthy, so it can sit next to any product without extra checks. */
export function StockBadge({ product, className = '' }: {product: Pick<Product, 'stock' | 'lowStockThreshold'>;className?: string;}) {
  const badge = BADGES[getStockStatus(product)];
  if (!badge) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${badge.className} ${className}`}>

      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
      {badge.label}
    </span>);

}
