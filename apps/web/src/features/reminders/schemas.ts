import i18n from '../../i18n';
import { z } from 'zod';
import { isNigerianMobile, stripPhone, toE164 } from '../../utils/phone';

/**
 * Notification preferences. A phone number is required for SMS (unless opted out of everything) and,
 * when given, must be a Nigerian mobile: +234 or 0 followed by 70x, 80x, 81x, 90x or 91x.
 * Stored in +234 form whatever way it was typed.
 */
export const preferencesSchema = z.
object({
  push: z.boolean(),
  sms: z.boolean(),
  optedOut: z.boolean(),
  phone: z.string().transform((raw) => stripPhone(raw))
}).
superRefine((v, ctx) => {
  if (v.phone && !isNigerianMobile(v.phone)) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: i18n.t('jobs:prefs.phoneInvalid') });
  } else if (v.sms && !v.optedOut && !v.phone) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: i18n.t('jobs:prefs.phoneNeeded') });
  }
}).
transform((v) => ({ ...v, phone: v.phone ? toE164(v.phone) : '' }));

export type PreferencesFormValues = z.input<typeof preferencesSchema>;
export type PreferencesFormData = z.output<typeof preferencesSchema>;
