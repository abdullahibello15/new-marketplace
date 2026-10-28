import { useEffect, useState } from 'react';
import { useVendors } from '../../../contexts/VendorsContext';
import type { Order } from '../types';

/**
 * Which lines the vendor can supply, for the confirm dialog. Starts with every line whose stock covers
 * the quantity ticked, and lines without enough stock unticked, using the vendor's live product stock.
 */
export function useConfirmOrderSelection(order: Order, open: boolean) {
  const { getVendor } = useVendors();
  const products = getVendor(order.vendorId)?.products ?? [];
  const stockFor = (productId: string) => products.find((p) => p.id === productId)?.stock ?? 0;
  const [outOfStock, setOutOfStock] = useState<string[]>([]);

  // Fresh defaults every time the dialog opens; stock may have changed since last time.
  useEffect(() => {
    if (!open) return;
    const current = getVendor(order.vendorId)?.products ?? [];
    setOutOfStock(order.items.filter((i) => (current.find((p) => p.id === i.productId)?.stock ?? 0) < i.quantity).map((i) => i.productId));
  }, [open, order, getVendor]);

  const toggle = (productId: string) =>
  setOutOfStock((prev) => prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]);

  const supplied = order.items.filter((i) => !outOfStock.includes(i.productId));
  const suppliedTotal = supplied.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return { outOfStock, toggle, stockFor, supplied, suppliedTotal, noneAvailable: supplied.length === 0 };
}
