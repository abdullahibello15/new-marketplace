import { z } from 'zod';
import { sanitizeText } from '../../lib/sanitize';
import { nigerLgas } from '../../data/nigerLgas';
import { BIO_MAX_LENGTH, TRADE_OTHER_MAX_LENGTH, tradeCategories } from '../../data/tradeCategories';
import { serviceDurations } from '../../data/vendorPortal';
import { validateDayHours } from '../../utils/workingHours';
import {
  DELIVERY_FEE_MAX,
  PICKUP_ADDRESS_MAX,
  PICKUP_ADDRESS_MIN,
  PICKUP_INSTRUCTIONS_MAX,
  NAME_MAX,
  NAME_MIN,
  PORTFOLIO_MAX,
  SERVICES_MAX,
  SERVICE_DESCRIPTION_MAX,
  SERVICE_NAME_MAX,
  SERVICE_PRICE_MAX } from
'./constants';
import type { NigerLga, TradeCategory } from '../../types/marketplace';

const cleanText = z.string().transform(sanitizeText);

export const isTradeCategory = (v: unknown): v is TradeCategory => tradeCategories.some((t) => t.id === v);
const isLga = (v: unknown): v is NigerLga => nigerLgas.some((l) => l === v);

/** "₦2,000", "2000" → 2000. Blank or non-numeric input gets a clear message instead of NaN. */
function priceField(what: string) {
  return z.
  string().
  transform((raw, ctx) => {
    const digits = raw.replace(/[₦,\s]/g, '');
    if (!digits) {
      ctx.addIssue({ code: 'custom', message: `Add a ${what}.` });
      return z.NEVER;
    }
    if (!/^\d+$/.test(digits)) {
      ctx.addIssue({ code: 'custom', message: 'Use whole Naira, like 5,000.' });
      return z.NEVER;
    }
    return Number(digits);
  }).
  pipe(z.number().min(1, 'Price must be more than ₦0.').max(SERVICE_PRICE_MAX, 'That price looks too high. Check for extra zeros.'));
}

const serviceSchema = z.
object({
  id: z.string(),
  name: cleanText.pipe(
    z.string().min(2, 'Give the service a name.').max(SERVICE_NAME_MAX, `Keep the name to ${SERVICE_NAME_MAX} characters.`)
  ),
  minPrice: priceField('starting price'),
  maxPrice: priceField('top price'),
  duration: z.string().refine((d) => serviceDurations.includes(d), 'Choose a typical duration.'),
  description: cleanText.pipe(
    z.string().max(SERVICE_DESCRIPTION_MAX, `Keep the description to ${SERVICE_DESCRIPTION_MAX} characters.`)
  ),
  photo: z.string().nullable()
}).
refine((s) => s.maxPrice >= s.minPrice, {
  path: ['maxPrice'],
  message: 'The top price can’t be less than the starting price.'
});

const dayHoursSchema = z.
object({ open: z.boolean(), opensAt: z.string(), closesAt: z.string() }).
superRefine((day, ctx) => {
  const problem = validateDayHours(day);
  if (problem) ctx.addIssue({ code: 'custom', message: problem });
});

/** "1,500" → 1500. Unlike service prices, 0 is allowed: it means free delivery. */
const deliveryFeeField = z.
string().
transform((raw, ctx) => {
  const digits = raw.replace(/[₦,\s]/g, '');
  if (!digits) {
    ctx.addIssue({ code: 'custom', message: 'Add a delivery fee, or 0 for free delivery.' });
    return z.NEVER;
  }
  if (!/^\d+$/.test(digits)) {
    ctx.addIssue({ code: 'custom', message: 'Use whole Naira, like 1,500.' });
    return z.NEVER;
  }
  return Number(digits);
}).
pipe(z.number().max(DELIVERY_FEE_MAX, `Keep the delivery fee to ₦${DELIVERY_FEE_MAX.toLocaleString('en-NG')} or less.`));

/** Pickup and delivery for product orders: at least one on, and each one that's on fully filled in. */
const fulfilmentSchema = z.
object({
  pickupEnabled: z.boolean(),
  pickupAddress: cleanText.pipe(z.string().max(PICKUP_ADDRESS_MAX, `Keep the address to ${PICKUP_ADDRESS_MAX} characters.`)),
  pickupInstructions: cleanText.pipe(z.string().max(PICKUP_INSTRUCTIONS_MAX, `Keep instructions to ${PICKUP_INSTRUCTIONS_MAX} characters.`)),
  deliveryEnabled: z.boolean(),
  deliveryFee: deliveryFeeField,
  deliveryAreas: z.array(z.string().pipe(z.custom<NigerLga>(isLga, 'That isn’t a Niger State LGA.')))
}).
superRefine((f, ctx) => {
  if (!f.pickupEnabled && !f.deliveryEnabled) {
    ctx.addIssue({ code: 'custom', path: ['pickupEnabled'], message: 'Turn on pickup, delivery or both so customers can get their orders.' });
  }
  if (f.pickupEnabled && f.pickupAddress.length < PICKUP_ADDRESS_MIN) {
    ctx.addIssue({ code: 'custom', path: ['pickupAddress'], message: 'Add the address or landmark customers collect from.' });
  }
  if (f.deliveryEnabled && f.deliveryAreas.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['deliveryAreas'], message: 'Pick at least one LGA you deliver to.' });
  }
});

export const profileSchema = z.
object({
  name: cleanText.pipe(
    z.string().min(NAME_MIN, 'Add the name customers know you by.').max(NAME_MAX, `Keep your name to ${NAME_MAX} characters.`)
  ),
  tradeCategory: z.string().pipe(z.custom<TradeCategory>(isTradeCategory, 'Choose the trade customers will find you under.')),
  tradeCategoryOther: cleanText.pipe(z.string().max(TRADE_OTHER_MAX_LENGTH, `Keep it under ${TRADE_OTHER_MAX_LENGTH} characters.`)),
  bio: cleanText.pipe(z.string().max(BIO_MAX_LENGTH, `Keep your bio to ${BIO_MAX_LENGTH} characters.`)),
  gallery: z.array(z.string()).max(PORTFOLIO_MAX, `Use ${PORTFOLIO_MAX} photos or fewer.`),
  services: z.array(serviceSchema).max(SERVICES_MAX, `You can list up to ${SERVICES_MAX} services.`),
  workingHours: z.object({
    mon: dayHoursSchema,
    tue: dayHoursSchema,
    wed: dayHoursSchema,
    thu: dayHoursSchema,
    fri: dayHoursSchema,
    sat: dayHoursSchema,
    sun: dayHoursSchema
  }),
  serviceAreas: z.array(z.string().pipe(z.custom<NigerLga>(isLga, 'That isn’t a Niger State LGA.'))).min(1, 'Pick at least one LGA you serve.'),
  fulfilment: fulfilmentSchema,
  acceptsCash: z.boolean()
}).
superRefine((v, ctx) => {
  if (v.tradeCategory === 'other' && !v.tradeCategoryOther) {
    ctx.addIssue({ code: 'custom', path: ['tradeCategoryOther'], message: 'Tell customers what your trade is.' });
  }
});
