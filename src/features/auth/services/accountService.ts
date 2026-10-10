import i18n from '../../../i18n';
import { mockResponse } from '../../../services/mockApi';
import { LANGUAGES, ROLE, type LanguageId, type Role } from '../constants';
import { AuthError } from '../errors';
import { finishEmailVerification, finishPasswordReset, mockHash, passwordProblem, startEmailVerification, startPasswordReset } from './authBackend';
import { commitUser, sessionRecord } from './authService';
import { applyClaim, applyProviderSetup, applyRiderSetup, withRole } from './roleSetup';
import type { ClaimSetupInput, RiderSetupInput, User, VendorSetupInput } from '../types';

/*
 * The signed-in person's account (mocked): email and password (customers), extra roles, switching role,
 * and claiming a profile their association created. Phone + one-time code stays the main sign-in.
 */

const customerOnly = (roles: Role[]) => roles.length === 1 && roles[0] === ROLE.Customer;

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

/**
 * PUT /me/password — customers who've verified an email can sign in with it and a password too.
 * Vendors, riders and staff keep using their phone (staff will get a stronger sign-in; see secondFactorFor).
 */
export function setPassword(password: string): Promise<User> {
  return mockResponse(() => {
    const user = sessionRecord();
    if (!customerOnly(user.roles)) throw new AuthError('not_allowed', i18n.t('auth:error.emailCustomersOnly'), 403);
    if (!user.email || !user.emailVerified) throw new AuthError('not_allowed', i18n.t('auth:error.verifyEmailFirst'), 409);
    const problem = passwordProblem(password);
    if (problem) throw new AuthError('weak_password', problem, 400);
    return commitUser({ ...user, passwordHash: mockHash(password), hasPassword: true });
  }, 600);
}

/** POST /auth/password/forgot { email } — always the same answer, whether or not the email has an account. */
export function requestPasswordReset(email: string): Promise<void> {
  return mockResponse(() => startPasswordReset(email, new Date()), 700);
}

/** POST /auth/password/reset { token, password } */
export function resetPassword(token: string, password: string): Promise<void> {
  return mockResponse(() => finishPasswordReset(token, password, new Date()), 600);
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
