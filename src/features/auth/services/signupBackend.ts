import i18n from '../../../i18n';
import { nigerLgas } from '../../../data/nigerLgas';
import { LANGUAGES, ROLE, type LanguageId } from '../constants';
import { AuthError } from '../errors';
import { assertEmailFree, assertPhoneFree, isEmail, mockHash, newUserId, normalizeOrThrow, passwordProblem, saveUser } from './authBackend';
import { applyProviderSetup, assertCanCreateVendor } from './roleSetup';
import type { StoredUser } from '../mock/users';
import type { CustomerSignupInput, ProviderSignupInput, VendorBusinessInput } from '../types';

/*
 * MOCK backend for signup (customers and providers). Sync and takes `now`; authService.ts wraps it.
 * The browser checks the same rules first (schemas.ts), but the server is what counts. Passwords are
 * stored only as a placeholder hash (see mockHash): real hashing (argon2id/bcrypt) happens on the backend.
 */

const invalid = (message: string) => new AuthError('invalid_input', message, 400);

function cleanName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) throw invalid(i18n.t('auth:error.nameRange'));
  return name;
}

function cleanEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!isEmail(email)) throw new AuthError('invalid_email', i18n.t('auth:error.invalidEmail'), 400);
  return email;
}

function checkPassword(password: string) {
  const problem = passwordProblem(password);
  if (problem) throw new AuthError('weak_password', problem, 400);
}

const languageOf = (l: LanguageId | undefined): LanguageId => LANGUAGES.some((x) => x.id === l) ? l as LanguageId : 'en';

function newAccount(now: Date): Omit<StoredUser, 'roles' | 'activeRole' | 'name' | 'email' | 'phone' | 'language'> {
  return {
    id: newUserId(),
    phoneVerified: false,
    emailVerified: false,
    createdAt: now.toISOString(),
    hasPassword: true,
    adminRole: null,
    adminSuspendedAt: null,
    adminAddedBy: null,
    lastLoginAt: now.toISOString(),
    vendorId: null,
    rider: null,
    address: null,
    area: null,
    passwordHash: null,
    vendorDraft: null,
    providerSignup: null
  };
}

/**
 * POST /auth/signup/customer — name, email, password. No phone: they add one later, when it's needed
 * (SMS reminders, cash or delivery orders). They can browse at once; booking and paying need the email
 * verified (the code is sent next, from the verify screen).
 */
export function registerCustomerNow(input: CustomerSignupInput, now: Date): StoredUser {
  const name = cleanName(input.name);
  const email = cleanEmail(input.email);
  checkPassword(input.password);
  assertEmailFree(email);
  return saveUser({
    ...newAccount(now),
    roles: [ROLE.Customer],
    activeRole: ROLE.Customer,
    name,
    email,
    phone: '',
    language: languageOf(input.language),
    passwordHash: mockHash(input.password)
  });
}

/**
 * POST /auth/signup/provider — name, phone, email, base location, password, terms. One vendor profile
 * per account and per phone number. The vendor profile itself is created in vendor setup (business name,
 * trade, service or retail), from the location given here.
 */
export function registerProviderNow(input: ProviderSignupInput, now: Date): StoredUser {
  const name = cleanName(input.name);
  const phone = normalizeOrThrow(input.phone);
  const email = cleanEmail(input.email);
  if (!nigerLgas.includes(input.lga)) throw invalid(i18n.t('auth:error.chooseLga'));
  const town = input.town.trim();
  if (town.length < 2) throw invalid(i18n.t('auth:error.enterTown'));
  if (!input.acceptedTerms) throw invalid(i18n.t('auth:error.acceptTerms'));
  checkPassword(input.password);
  assertPhoneFree(phone);
  assertEmailFree(email);
  // An association may already have made a profile for this number: claim it instead.
  assertCanCreateVendor(phone, null);
  return saveUser({
    ...newAccount(now),
    roles: [ROLE.Provider],
    activeRole: ROLE.Provider,
    name,
    phone,
    email,
    language: languageOf(input.language),
    passwordHash: mockHash(input.password),
    providerSignup: { lga: input.lga, town, termsAcceptedAt: now.toISOString() }
  });
}

/**
 * POST /vendor/setup — the vendor profile for a provider who signed up: business name, trade and type,
 * at the base location from signup (also the default service area). One vendor profile per account.
 */
export function completeVendorSetupNow(user: StoredUser, input: VendorBusinessInput, now: Date): StoredUser {
  const location = user.providerSignup;
  if (!user.roles.includes(ROLE.Provider) || !location) throw new AuthError('not_allowed', i18n.t('auth:error.setUpBusiness'), 409);
  const withVendor = applyProviderSetup(user, { ...input, lga: location.lga, town: location.town, acceptedTerms: true }, now);
  return saveUser({ ...withVendor, providerSignup: null });
}
