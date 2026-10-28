import { z } from 'zod';
import i18n from '../../i18n';
import { nigerLgas } from '../../data/nigerLgas';
import { normalizeNigerianPhone, phoneError } from '../../utils/phone';
import { PASSWORD } from './constants';
import type { NigerLga } from '../../types/marketplace';

/*
 * The signup and login forms' rules, one schema per form. The mock server checks the same rules again
 * (services/signupBackend.ts, authBackend.ts); these give instant, inline messages under each field.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const t = (key: string, values?: Record<string, unknown>) => () => i18n.t(key, values);

const fullName = z.
string().
transform((v) => v.trim().replace(/\s+/g, ' ')).
pipe(z.string().min(2, { error: t('auth:form.nameMin') }).max(80, { error: t('auth:form.nameMax', { max: 80 }) }));

const email = z.
string().
trim().
toLowerCase().
min(1, { error: t('auth:form.emailRequired') }).
refine((v) => EMAIL.test(v), { error: t('auth:error.invalidEmail') });

const newPassword = z.
string().
min(PASSWORD.minLength, { error: t('auth:error.passwordMin', { min: PASSWORD.minLength }) }).
max(PASSWORD.maxLength, { error: t('auth:error.passwordMax', { max: PASSWORD.maxLength }) });

/** Any common way of writing a Nigerian mobile → "+234XXXXXXXXXX" (the shared phone helper). */
const nigerianPhone = z.string().transform((raw, ctx) => {
  const phone = normalizeNigerianPhone(raw);
  if (!phone) {
    ctx.addIssue({ code: 'custom', message: phoneError(raw) ?? i18n.t('common:phone.invalid') });
    return z.NEVER;
  }
  return phone;
});

const isLga = (v: unknown): v is NigerLga => nigerLgas.some((l) => l === v);

export const customerSignupSchema = z.object({
  name: fullName,
  email,
  password: newPassword
});

export const providerSignupSchema = z.object({
  name: fullName,
  phone: nigerianPhone,
  email,
  lga: z.string().pipe(z.custom<NigerLga>(isLga, { error: t('auth:error.chooseLga') })),
  town: z.string().trim().min(2, { error: t('auth:error.enterTown') }).max(80, { error: t('auth:form.townMax', { max: 80 }) }),
  password: newPassword,
  acceptedTerms: z.boolean().refine((v) => v, { error: t('auth:error.acceptTerms') })
});

/** One field for an email or a phone number. Only the shape is checked here; the server checks the rest. */
export const passwordLoginSchema = z.object({
  identifier: z.
  string().
  trim().
  min(1, { error: t('auth:form.identifierRequired') }).
  refine((v) => v.includes('@') ? EMAIL.test(v) : !!normalizeNigerianPhone(v), { error: t('auth:form.identifierInvalid') }),
  password: z.string().min(1, { error: t('auth:form.passwordRequired') })
});

export type CustomerSignupValues = z.input<typeof customerSignupSchema>;
export type CustomerSignupData = z.output<typeof customerSignupSchema>;
export type ProviderSignupValues = z.input<typeof providerSignupSchema>;
export type ProviderSignupData = z.output<typeof providerSignupSchema>;
export type PasswordLoginValues = z.input<typeof passwordLoginSchema>;
export type PasswordLoginData = z.output<typeof passwordLoginSchema>;
