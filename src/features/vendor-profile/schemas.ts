import { formatNaira } from '../../utils/format';
import { z } from 'zod';
import i18n from '../../i18n';
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
function priceField(what: 'starting' | 'top') {
  return z.
  string().
  transform((raw, ctx) => {
    const digits = raw.replace(/[₦,\s]/g, '');
    if (!digits) {
      ctx.addIssue({ code: 'custom', message: what === 'starting' ? i18n.t('vendor:profile.form.addStarting') : i18n.t('vendor:profile.form.addTop') });
      return z.NEVER;
    }
    if (!/^\d+$/.test(digits)) {
      ctx.addIssue({ code: 'custom', message: i18n.t('vendor:profile.form.wholeNaira', { example: '5,000' }) });
      return z.NEVER;
    }
    return Number(digits);
  }).
  pipe(z.number().min(1, { error: () => i18n.t('vendor:profile.form.priceZero') }).max(SERVICE_PRICE_MAX, { error: () => i18n.t('jobs:form.priceHigh') }));
}

const serviceSchema = z.
object({
  id: z.string(),
  name: cleanText.pipe(
    z.string().min(2, { error: () => i18n.t('vendor:profile.form.serviceName') }).max(SERVICE_NAME_MAX, { error: () => i18n.t('vendor:profile.form.nameMax', { max: SERVICE_NAME_MAX }) })
  ),
  minPrice: priceField('starting'),
  maxPrice: priceField('top'),
  duration: z.string().refine((d) => serviceDurations.includes(d), { error: () => i18n.t('vendor:profile.form.duration') }),
  description: cleanText.pipe(
    z.string().max(SERVICE_DESCRIPTION_MAX, { error: () => i18n.t('jobs:form.descriptionMax', { max: SERVICE_DESCRIPTION_MAX }) })
  ),
  photo: z.string().nullable()
}).
refine((s) => s.maxPrice >= s.minPrice, {
  path: ['maxPrice'],
  error: () => i18n.t('vendor:profile.form.topBelowStart')
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
    ctx.addIssue({ code: 'custom', message: i18n.t('vendor:profile.form.addFee') });
    return z.NEVER;
  }
  if (!/^\d+$/.test(digits)) {
    ctx.addIssue({ code: 'custom', message: i18n.t('vendor:profile.form.wholeNaira', { example: '1,500' }) });
    return z.NEVER;
  }
  return Number(digits);
}).
pipe(z.number().max(DELIVERY_FEE_MAX, { error: () => i18n.t('vendor:profile.form.feeMax', { max: formatNaira(DELIVERY_FEE_MAX) }) }));

/** Pickup and delivery for product orders: at least one on, and each one that's on fully filled in. */
const fulfilmentSchema = z.
object({
  pickupEnabled: z.boolean(),
  pickupAddress: cleanText.pipe(z.string().max(PICKUP_ADDRESS_MAX, { error: () => i18n.t('vendor:profile.form.addressMax', { max: PICKUP_ADDRESS_MAX }) })),
  pickupInstructions: cleanText.pipe(z.string().max(PICKUP_INSTRUCTIONS_MAX, { error: () => i18n.t('vendor:profile.form.instructionsMax', { max: PICKUP_INSTRUCTIONS_MAX }) })),
  deliveryEnabled: z.boolean(),
  deliveryFee: deliveryFeeField,
  deliveryAreas: z.array(z.string().pipe(z.custom<NigerLga>(isLga, { error: () => i18n.t('vendor:profile.form.notLga') })))
}).
superRefine((f, ctx) => {
  if (!f.pickupEnabled && !f.deliveryEnabled) {
    ctx.addIssue({ code: 'custom', path: ['pickupEnabled'], message: i18n.t('vendor:profile.form.turnOn') });
  }
  if (f.pickupEnabled && f.pickupAddress.length < PICKUP_ADDRESS_MIN) {
    ctx.addIssue({ code: 'custom', path: ['pickupAddress'], message: i18n.t('vendor:profile.form.pickupAddress') });
  }
  if (f.deliveryEnabled && f.deliveryAreas.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['deliveryAreas'], message: i18n.t('vendor:profile.form.deliveryAreas') });
  }
});

export const profileSchema = z.
object({
  name: cleanText.pipe(
    z.string().min(NAME_MIN, { error: () => i18n.t('vendor:profile.form.nameMin') }).max(NAME_MAX, { error: () => i18n.t('vendor:profile.form.nameMax', { max: NAME_MAX }) })
  ),
  tradeCategory: z.string().pipe(z.custom<TradeCategory>(isTradeCategory, { error: () => i18n.t('vendor:profile.form.trade') })),
  tradeCategoryOther: cleanText.pipe(z.string().max(TRADE_OTHER_MAX_LENGTH, { error: () => i18n.t('jobs:form.keepTo', { max: TRADE_OTHER_MAX_LENGTH }) })),
  bio: cleanText.pipe(z.string().max(BIO_MAX_LENGTH, { error: () => i18n.t('vendor:profile.form.bioMax', { max: BIO_MAX_LENGTH }) })),
  gallery: z.array(z.string()).max(PORTFOLIO_MAX, { error: () => i18n.t('jobs:form.photoMax', { max: PORTFOLIO_MAX }) }),
  services: z.array(serviceSchema).max(SERVICES_MAX, { error: () => i18n.t('vendor:profile.form.servicesMax', { max: SERVICES_MAX }) }),
  workingHours: z.object({
    mon: dayHoursSchema,
    tue: dayHoursSchema,
    wed: dayHoursSchema,
    thu: dayHoursSchema,
    fri: dayHoursSchema,
    sat: dayHoursSchema,
    sun: dayHoursSchema
  }),
  serviceAreas: z.array(z.string().pipe(z.custom<NigerLga>(isLga, { error: () => i18n.t('vendor:profile.form.notLga') }))).min(1, { error: () => i18n.t('vendor:profile.form.serviceAreas') }),
  fulfilment: fulfilmentSchema,
  acceptsCash: z.boolean()
}).
superRefine((v, ctx) => {
  if (v.tradeCategory === 'other' && !v.tradeCategoryOther) {
    ctx.addIssue({ code: 'custom', path: ['tradeCategoryOther'], message: i18n.t('vendor:profile.form.tradeOther') });
  }
});
