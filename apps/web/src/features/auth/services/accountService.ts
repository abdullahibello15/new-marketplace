import i18n from '../../../i18n';
import { mockResponse } from '../../../services/mockApi';
import { LANGUAGES, ROLE, type LanguageId, type Role } from '../constants';
import { AuthError } from '../errors';
import { finishEmailVerification, finishPhoneVerification, mockHash, passwordProblem, sendEmailCodeNow, sendPhoneCodeNow, startEmailVerification, type CodeSent } from './authBackend';
import { completeVendorSetupNow } from './signupBackend';
import { commitUser, sessionRecord } from './authService';
import { endOtherSessionsForPasswordChange } from './sessionService';
import { applyClaim, applyProviderSetup, applyRiderSetup, withRole } from './roleSetup';
import type { ClaimSetupInput, RiderSetupInput, User, VendorBusinessInput, VendorSetupInput } from '../types';

/*
 * The signed-in person's account (mocked): verifying their email and phone, password, vendor setup after
 * signup, extra roles, switching role, and claiming a profile their association created.
 */

/** Password sign-in is for customers and providers; riders and staff use phone codes. */
const canHavePassword = (roles: Role[]) => roles.every((r) => r === ROLE.Customer || r === ROLE.Provider);

/** PUT /me { name, language } */
export function updateAccount(input: {name: string;language: LanguageId;}): Promise<User> {
  return mockResponse(() => {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 80) throw new AuthError('invalid_input', i18n.t('auth:error.nameRange'), 400);
    if (!LANGUAGES.some((l) => l.id === input.language)) throw new AuthError('invalid_input', i18n.t('auth:error.chooseLanguage'), 400);
    return commitUser({ ...sessionRecord(), name, language: input.language });
  });
}

/** POST /me/email { email } — saves it unverified and sends a code (MOCK: shown in the dev banner). */
export function addEmail(email: string): Promise<User> {
  return mockResponse(() => {
    const user = startEmailVerification(sessionRecord(), email, new Date());
    return commitUser(user);
  }, 600);
}

/** POST /me/email/verify { code } */
export function verifyEmail(code: string): Promise<User> {
  return mockResponse(() => commitUser(finishEmailVerification(sessionRecord(), code, new Date())), 500);
}

/** POST /me/email/code — (re)sends a code to the account's email (after signup, or "verify later"). */
export function sendEmailCode(): Promise<CodeSent> {
  return mockResponse(() => sendEmailCodeNow(sessionRecord(), new Date()), 600);
}

/**
 * POST /me/phone/code { phone } — sends a code to verify the account's phone, or a new number (customers
 * add one when it's needed, e.g. for SMS reminders or a delivery order). A new number must be free.
 */
export function sendPhoneCode(phone: string): Promise<CodeSent> {
  return mockResponse(() => {
    const { user, sent } = sendPhoneCodeNow(sessionRecord(), phone, new Date());
    commitUser(user);
    return sent;
  }, 600);
}

/** POST /me/phone/verify { code } — providers become visible to customers once this is done. */
export function verifyPhone(code: string): Promise<User> {
  return mockResponse(() => commitUser(finishPhoneVerification(sessionRecord(), code, new Date())), 500);
}

/** POST /vendor/setup — after provider signup: business name, trade and type (one vendor profile per account). */
export function completeVendorSetup(input: VendorBusinessInput): Promise<User> {
  return mockResponse(() => commitUser(completeVendorSetupNow(sessionRecord(), input, new Date())), 700);
}

/**
 * PUT /me/password — customers and providers with a verified email can set or change their password.
 * Riders and staff keep using phone codes (staff will get a stronger sign-in; see secondFactorFor).
 * Changing it signs out every other device (this one stays signed in).
 */
export function setPassword(password: string): Promise<User> {
  return mockResponse(() => {
    const user = sessionRecord();
    if (!canHavePassword(user.roles)) throw new AuthError('not_allowed', i18n.t('auth:error.emailCustomersOnly'), 403);
    if (!user.email || !user.emailVerified) throw new AuthError('not_allowed', i18n.t('auth:error.verifyEmailFirst'), 409);
    const problem = passwordProblem(password);
    if (problem) throw new AuthError('weak_password', problem, 400);
    const updated = commitUser({ ...user, passwordHash: mockHash(password), hasPassword: true });
    endOtherSessionsForPasswordChange();
    return updated;
  }, 600);
}

/* ---------- Roles ---------- */

/** PUT /me/active-role — the shell and navigation follow it; it's remembered for next time. */
export function switchRole(role: Role): Promise<User> {
  return mockResponse(() => {
    const user = sessionRecord();
    if (!user.roles.includes(role)) throw new AuthError('not_allowed', i18n.t('auth:error.roleMissing'), 403);
    return commitUser({ ...user, activeRole: role });
  }, 200);
}

export type AddRoleInput =
{role: typeof ROLE.Customer;} |
{role: typeof ROLE.Provider;vendor: VendorSetupInput;} |
{role: typeof ROLE.Rider;rider: RiderSetupInput;};

/** POST /me/roles — e.g. a customer who becomes a provider. Runs that role's setup, then switches to it. */
export function addRole(input: AddRoleInput): Promise<User> {
  return mockResponse(() => {
    const user = sessionRecord();
    if (user.roles.includes(input.role)) throw new AuthError('role_exists', i18n.t('auth:error.roleExists'), 409);
    const now = new Date();
    if (input.role === ROLE.Provider) return commitUser(applyProviderSetup(user, input.vendor, now));
    if (input.role === ROLE.Rider) return commitUser(applyRiderSetup(user, input.rider));
    return commitUser(withRole(user, ROLE.Customer));
  }, 700);
}

/** POST /claim/:token — a signed-in person whose verified phone matches the invitation claims that profile. */
export function claimInvitedProfile(input: ClaimSetupInput): Promise<User> {
  return mockResponse(() => commitUser(applyClaim(sessionRecord(), input, new Date())), 700);
}
