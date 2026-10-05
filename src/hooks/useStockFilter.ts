import { useMemo, useState } from 'react';
import { summarizeStock } from '../utils/products';
import type { Product, StockFilter } from '../types/marketplace';

/** Stock summary counts and the All / Low stock / Out of stock filter for the vendor's product list. */
export function useStockFilter(products: Product[]) {
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const summary = useMemo(() => summarizeStock(products), [products]);

  const counts: Record<StockFilter, number> = {
    all: summary.total,
    low_stock: summary.low,
    out_of_stock: summary.out
  };

  return { stockFilter, setStockFilter, summary, counts };
}
