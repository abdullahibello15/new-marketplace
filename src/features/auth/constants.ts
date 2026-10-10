import { APP_LANGUAGES, type AppLanguage } from '../../i18n/config';
/*
 * Authentication: THE role list and the sign-in rules. Every shell, guard and service reads roles from here.
 * ⚠️ Limits marked PLACEHOLDER should be confirmed against the build spec.
 */

/** The ONE role list. A person can hold several (e.g. a customer who's also a provider). */
export const ROLE = {
  Customer: 'customer',
  /** A vendor: offers services or sells products. */
  Provider: 'provider',
  Rider: 'rider',
  /** Gwani staff. Which admin sections they get is the admin sub-role (admin/config/roles.ts). */
  Admin: 'admin'
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

/** Roles people can choose at signup (Admin is granted by Gwani). */
export const SIGNUP_ROLES = [ROLE.Customer, ROLE.Provider, ROLE.Rider] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export const ROLE_META: Record<Role, {label: string;description: string;home: string;}> = {
  customer: { label: 'Customer', description: 'Find and book trusted local services and products.', home: '/' },
  provider: { label: 'Provider', description: 'Offer your services or sell your products.', home: '/pro' },
  rider: { label: 'Rider', description: 'Deliver orders in your area.', home: '/rider' },
  admin: { label: 'Gwani staff', description: 'Run the marketplace.', home: '/admin' }
};

export const AUTH_ROUTES = {
  login: '/login',
  signup: '/signup',
  welcome: '/welcome',
  forgotPassword: '/login/forgot',
  resetPassword: (token: string) => `/reset-password/${encodeURIComponent(token)}`,
  addRole: '/account/roles',
  providerTerms: '/terms/providers'
} as const;

/** One-time codes by SMS. */
export const OTP = {
  length: 6,
  /** A code works for this long. */
  expiresMinutes: 5,
  /** Wait before another code can be sent. */
  resendSeconds: 60,
  /** Wrong codes allowed before the number is locked. PLACEHOLDER */
  maxAttempts: 5,
  lockoutMinutes: 15,
  /** After verifying a new number, signup must finish within this time. */
  signupWindowMinutes: 30
} as const;

export const PASSWORD = { minLength: 8, maxLength: 128 } as const;

/** Failed email sign-ins per email address before a cool-off. PLACEHOLDER */
export const EMAIL_LOGIN_LIMIT = { maxFailures: 5, windowMinutes: 15, lockoutMinutes: 15 } as const;

/** Codes and links sent to verify an email or reset a password. */
export const EMAIL_CODE = { length: 6, expiresMinutes: 30, resetLinkMinutes: 30 } as const;

/** The app's languages (i18n/config.ts is the one list). Saved as user.language. */
export const LANGUAGES = APP_LANGUAGES;
export type LanguageId = AppLanguage;

export const RIDER_VEHICLES = [
{ id: 'bicycle', label: 'Bicycle' },
{ id: 'motorbike', label: 'Motorbike' },
{ id: 'tricycle', label: 'Tricycle (keke)' },
{ id: 'car', label: 'Car' }] as
const;
export type RiderVehicle = (typeof RIDER_VEHICLES)[number]['id'];

/** New providers' first plan. ⚠️ PLACEHOLDER: the trial length isn't in the build spec. */
export const PROVIDER_SIGNUP = { trialDays: 14 } as const;
