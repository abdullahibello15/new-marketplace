import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../services/mockApi';
import { PAYMENT_METHOD, PAYMENT_SUBJECT } from '../../payments/constants';
import { initiatePayment, verifyPayment } from '../../payments/services/paymentService';
import { FULFILMENT_METHOD } from '../constants';
import { getSavedCart, mergeGuestCart, saveCart } from './cartService';
import { placeOrders } from './orderService';

/*
 * The "server" side of guest checkout: these calls run with no access token, as a guest's would (or
 * someone calling the API directly after typing the checkout URL). Browsing and the local cart are open;
 * the saved cart, placing orders and paying are not.
 */

const status = (p: Promise<unknown>) =>
p.then(
  () => 'resolved',
  (e: unknown) => e instanceof ApiError ? e.status : 'other error'
);

describe('a guest (no sign-in) calling the API', () => {
  it('can’t read, save or merge an account cart', async () => {
    expect(await status(getSavedCart())).toBe(401);
    expect(await status(saveCart([]))).toBe(401);
    expect(await status(mergeGuestCart([]))).toBe(401);
  });

  it('can’t place an order', async () => {
    const order = placeOrders({ orders: [{ vendorId: 'hauwa-tailoring', method: FULFILMENT_METHOD.Pickup, items: [{ productId: 'p13', unitPrice: 4500, quantity: 1 }] }], delivery: null });
    expect(await status(order)).toBe(401);
  });

  it('can’t start or check a payment', async () => {
    expect(await status(initiatePayment({ kind: PAYMENT_SUBJECT.Order, id: '5012' }, { method: PAYMENT_METHOD.Card }))).toBe(401);
    expect(await status(verifyPayment('PAY-DOES-NOT-MATTER'))).not.toBe('resolved');
  });
});
