import { z } from 'zod';
import { sanitizeText } from '../../lib/sanitize';
import { nigerLgas } from '../../data/nigerLgas';
import { BIO_MAX_LENGTH, TRADE_OTHER_MAX_LENGTH, tradeCategories } from '../../data/tradeCategories';
import { serviceDurations } from '../../data/vendorPortal';
import { validateDayHours } from '../../utils/workingHours';
import {
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
  serviceAreas: z.array(z.string().pipe(z.custom<NigerLga>(isLga, 'That isn’t a Niger State LGA.'))).min(1, 'Pick at least one LGA you serve.')
}).
superRefine((v, ctx) => {
  if (v.tradeCategory === 'other' && !v.tradeCategoryOther) {
    ctx.addIssue({ code: 'custom', path: ['tradeCategoryOther'], message: 'Tell customers what your trade is.' });
  }
});
