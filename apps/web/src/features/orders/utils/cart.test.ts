import { describe, expect, it } from 'vitest';
import { CART_MAX_LINES, mergeCarts, parseStoredCart } from './cart';
import type { CartItem } from '../types';

const line = (productId: string, over: Partial<CartItem> = {}): CartItem => ({
  vendorId: 'v1',
  vendorName: 'Shop',
  productId,
  name: `Item ${productId}`,
  image: null,
  unitPrice: 1_000,
  quantity: 1,
  maxQuantity: 10,
  addedAt: '2026-10-01T10:00:00.000Z',
  ...over
});

describe('mergeCarts', () => {
  it('keeps both carts when they share nothing: saved lines first, then the guest’s', () => {
    const merged = mergeCarts([line('a')], [line('b'), line('c', { vendorId: 'v2' })]);
    expect(merged.map((i) => `${i.vendorId}/${i.productId}`)).toEqual(['v1/a', 'v1/b', 'v2/c']);
  });

  it('adds up the same product, capped at the stock, with the guest’s newer price and the earlier time', () => {
    const saved = line('a', { quantity: 3, unitPrice: 900, addedAt: '2026-09-01T00:00:00.000Z' });
    const guest = line('a', { quantity: 4, unitPrice: 1_100, maxQuantity: 5, addedAt: '2026-10-20T00:00:00.000Z' });
    expect(mergeCarts([saved], [guest])).toEqual([{ ...guest, quantity: 5, addedAt: '2026-09-01T00:00:00.000Z' }]);
  });

  it('treats the same product id from another shop as a different line', () => {
    expect(mergeCarts([line('a')], [line('a', { vendorId: 'v2' })])).toHaveLength(2);
  });

  it('returns either cart unchanged when the other is empty', () => {
    expect(mergeCarts([], [line('a')])).toEqual([line('a')]);
    expect(mergeCarts([line('a')], [])).toEqual([line('a')]);
  });

  it('never grows past the line limit', () => {
    const many = Array.from({ length: CART_MAX_LINES }, (_, i) => line(`s${i}`));
    expect(mergeCarts(many, [line('extra')])).toHaveLength(CART_MAX_LINES);
  });
});

describe('parseStoredCart', () => {
  it('drops bad and duplicate lines and caps quantities at the stock', () => {
    const parsed = parseStoredCart([line('a', { quantity: 50 }), line('a'), { productId: 'x' }, 'junk']);
    expect(parsed).toEqual([line('a', { quantity: 10 })]);
    expect(parseStoredCart('nope')).toBeNull();
  });
});
