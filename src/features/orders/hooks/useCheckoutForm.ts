import { useMemo, useRef } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { user } from '../../../data/user';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { placeLabel } from '../../discovery/constants';
import { usePlace } from '../../discovery/hooks/usePlace';
import { FULFILMENT_METHOD } from '../constants';
import { makeCheckoutSchema, type CheckoutFormData, type CheckoutFormValues } from '../schemas';
import { CheckoutChangedError, placeOrders } from '../services/orderService';
import { groupCart } from '../utils/cart';
import { enabledMethods, feeFor } from '../utils/fulfilment';
import type { Place } from '../../discovery/types';
import type { CartCheck, CheckoutResult } from '../types';

interface Options {
  check: CartCheck;
  places: Place[];
  /** The server found new changes: check the cart again so the customer can review them. */
  onChanged: () => void;
  onPlaced: (result: CheckoutResult) => void;
}

/** Checkout form (RHF + Zod): pickup or delivery per vendor, the shared delivery details, live totals and submit. */
export function useCheckoutForm({ check, places, onChanged, onPlaced }: Options) {
  const toast = useToast();
  const { place } = usePlace();
  const groups = useMemo(() => groupCart(check.items), [check.items]);

  const schema = useMemo(() => makeCheckoutSchema({ vendors: check.vendors, places }), [check.vendors, places]);
  // Read the latest schema at validation time, so a re-check (new vendor options) never validates against stale rules.
  const schemaRef = useRef(schema);
  schemaRef.current = schema;
  const resolver = useMemo<Resolver<CheckoutFormValues, unknown, CheckoutFormData>>(
    () => (values, context, options) => zodResolver(schemaRef.current)(values, context, options),
    []
  );

  const form = useForm<CheckoutFormValues, unknown, CheckoutFormData>({
    resolver,
    defaultValues: {
      groups: groups.map((g) => {
        const vendor = check.vendors.find((v) => v.vendorId === g.vendorId);
        return { vendorId: g.vendorId, method: vendor ? enabledMethods(vendor.fulfilment)[0] ?? FULFILMENT_METHOD.Pickup : FULFILMENT_METHOD.Pickup };
      }),
      // Start from the customer's profile and chosen area; they can change both.
      landmark: user.address,
      placeId: places.some((p) => p.id === place.id) ? place.id : '',
      phone: user.phone
    }
  });

  const chosen = useWatch({ control: form.control, name: 'groups' });
  const placeId = useWatch({ control: form.control, name: 'placeId' });
  const anyDelivery = chosen.some((g) => g.method === FULFILMENT_METHOD.Delivery);
  /** The LGA of the chosen delivery area, so vendor cards can warn about delivery coverage as soon as it changes. */
  const deliveryLga = places.find((p) => p.id === placeId)?.lga ?? null;

  /** Per-vendor totals for the chosen method, and the overall total. */
  const totals = useMemo(() => {
    const perVendor = groups.map((g) => {
      const vendor = check.vendors.find((v) => v.vendorId === g.vendorId);
      const method = chosen.find((c) => c.vendorId === g.vendorId)?.method ?? FULFILMENT_METHOD.Pickup;
      const deliveryFee = vendor ? feeFor(vendor.fulfilment, method) : 0;
      return { vendorId: g.vendorId, subtotal: g.subtotal, deliveryFee, total: g.subtotal + deliveryFee };
    });
    return { perVendor, grandTotal: perVendor.reduce((sum, v) => sum + v.total, 0) };
  }, [groups, chosen, check.vendors]);

  const submit = form.handleSubmit(
    async (data) => {
      const chosenPlace = places.find((p) => p.id === data.placeId);
      const needsDelivery = data.groups.some((g) => g.method === FULFILMENT_METHOD.Delivery);
      try {
        const placed = await placeOrders({
          orders: data.groups.map((g) => ({
            vendorId: g.vendorId,
            method: g.method,
            items: check.items.filter((i) => i.vendorId === g.vendorId).map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice }))
          })),
          delivery:
          needsDelivery && chosenPlace ?
          { landmark: data.landmark, placeId: chosenPlace.id, placeLabel: placeLabel(chosenPlace), lga: chosenPlace.lga, phone: data.phone } :
          null
        });
        toast.success(placed.orders.length === 1 ? 'Order placed.' : `${placed.orders.length} orders placed, one per vendor.`);
        onPlaced(placed);
      } catch (e) {
        toast.error(errorMessage(e));
        if (e instanceof CheckoutChangedError) onChanged();
      }
    },
    () => toast.error('Some details need fixing before you can place your order.')
  );

  return { form, groups, totals, anyDelivery, deliveryLga, submit };
}
