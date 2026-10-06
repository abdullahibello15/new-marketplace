import { z } from 'zod';
import { sanitizeText } from '../../lib/sanitize';
import { DELIVERY_LANDMARK_MAX, DELIVERY_LANDMARK_MIN, FULFILMENT_METHOD, NIGERIAN_PHONE_PATTERN } from './constants';
import { deliveryBlockedReason, enabledMethods } from './utils/fulfilment';
import type { Place } from '../discovery/types';
import type { CheckoutVendor } from './types';

const cleanText = z.string().transform(sanitizeText);

/** "0803 555 0142", "+234-803-555-0142" → "08035550142" / "+2348035550142". */
export const normalizePhone = (raw: string) => raw.replace(/[\s()-]/g, '');

/**
 * Checkout: pickup or delivery per vendor order, plus one delivery address and phone shared by every
 * delivery order. The address and phone are only required when at least one order is for delivery,
 * and each delivery vendor must cover the chosen area.
 */
export function makeCheckoutSchema({ vendors, places }: {vendors: CheckoutVendor[];places: Place[];}) {
  return z.
  object({
    groups: z.array(z.object({ vendorId: z.string(), method: z.enum(FULFILMENT_METHOD) })),
    landmark: cleanText,
    placeId: z.string(),
    phone: z.string().transform(normalizePhone)
  }).
  superRefine((v, ctx) => {
    const place = places.find((p) => p.id === v.placeId) ?? null;
    const anyDelivery = v.groups.some((g) => g.method === FULFILMENT_METHOD.Delivery);

    v.groups.forEach((g, i) => {
      const vendor = vendors.find((x) => x.vendorId === g.vendorId);
      if (!vendor) return;
      if (!enabledMethods(vendor.fulfilment).includes(g.method)) {
        ctx.addIssue({ code: 'custom', path: ['groups', i, 'method'], message: `${vendor.vendorName} doesn’t offer ${g.method}. Choose another option.` });
        return;
      }
      if (g.method === FULFILMENT_METHOD.Delivery) {
        const blocked = deliveryBlockedReason(vendor.fulfilment, vendor.vendorName, place?.lga ?? null);
        if (blocked) ctx.addIssue({ code: 'custom', path: ['groups', i, 'method'], message: blocked });
      }
    });

    if (!anyDelivery) return;
    if (v.landmark.length < DELIVERY_LANDMARK_MIN) {
      ctx.addIssue({ code: 'custom', path: ['landmark'], message: 'Add a street, house number or landmark so the rider can find you.' });
    } else if (v.landmark.length > DELIVERY_LANDMARK_MAX) {
      ctx.addIssue({ code: 'custom', path: ['landmark'], message: `Keep it to ${DELIVERY_LANDMARK_MAX} characters.` });
    }
    if (!place) ctx.addIssue({ code: 'custom', path: ['placeId'], message: 'Choose your town or LGA.' });
    if (!NIGERIAN_PHONE_PATTERN.test(v.phone)) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Enter a Nigerian mobile number, like 0803 555 0142.' });
    }
  });
}

export type CheckoutFormValues = z.input<ReturnType<typeof makeCheckoutSchema>>;
export type CheckoutFormData = z.output<ReturnType<typeof makeCheckoutSchema>>;
