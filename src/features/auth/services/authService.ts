import i18n from '../../../i18n';
import { mockResponse } from '../../../services/mockApi';
import { LANGUAGES, ROLE } from '../constants';
import { AuthError } from '../errors';
import { updateSessionUser } from '../session';
import { currentDevice } from '../utils/device';
import { createSession, requestSession, signOutHere } from './sessionService';
import {
  consumeSignupToken,
  findUser,
  findUserByEmail,
  findUserByPhone,
  isEmail,
  loginWithPasswordNow,
  newUserId,
  requestOtpNow,
  restoreSignupToken,
  saveUser,
  toUser,
  verifyOtpNow } from
'./authBackend';
import { applyClaim, applyRiderSetup, restoreProviderProfile } from './roleSetup';
import { registerCustomerNow, registerProviderNow } from './signupBackend';
import { requestResetOtpNow, resetPasswordNow, verifyResetOtpNow } from './passwordResetBackend';
import { PASSWORD_RESET } from '../passwordResetConfig';
import type { StoredUser } from '../mock/users';
import type {
  CustomerSignupInput,
  OtpRequestResult,
  PasswordResetOtpResult,
  PasswordResetOutcome,
  PasswordResetVerifyResult,
  ProviderSignupInput,
  RegisterInput,
  User,
  VerifyOtpResult } from
'../types';

/*
 * The auth API, with the signatures a real backend would have. All mocked (authBackend.ts holds the
 * "server"), all Promise-based. Each sign-in starts a session (sessionService.ts: tokens, refresh, sign-out);
 * account changes update the session's copy of the user (session.ts), which AuthProvider and every service read.
 */

/** POST /auth/otp { phone } — sends a one-time code by SMS. Accepts +234…, 0…, 234… or 803… formats. */
export function requestOtp(phone: string): Promise<OtpRequestResult> {
  return mockResponse(() => requestOtpNow(phone, new Date()), 600, { auth: false });
}

/**
 * POST /auth/otp/verify { phone, code } — a known number is signed in (no duplicate account is ever
 * created); a new one gets a short-lived signup token for registerUser. Phone sign-in remembers this
 * device by default (the login screen says so and lets them untick it).
 */
export async function verifyOtp(phone: string, code: string, { remember = true }: {remember?: boolean;} = {}): Promise<VerifyOtpResult> {
  const result = await mockResponse(() => verifyOtpNow(phone, code, new Date()), 500, { auth: false });
  if (result.status === 'signed_in') await startSession(result.user, remember);
  return result;
}

/**
 * POST /auth/register — phone-first signup: riders (after verifying their number), and providers claiming
 * the profile their association created. Customers and new providers sign up with registerCustomer and
 * registerProvider instead (email and password).
 */
export async function registerUser(data: RegisterInput): Promise<User> {
  const user = await mockResponse(() => registerNow(data, new Date()), 700, { auth: false });
  await startSession(user, data.remember ?? true);
  return user;
}

function registerNow(data: RegisterInput, now: Date): User {
  const phone = consumeSignupToken(data.signupToken, now);
  try {
    if (findUserByPhone(phone)) throw new AuthError('invalid_input', i18n.t('auth:error.accountExists'), 409);
    const name = data.name.trim();
    if (name.length < 2 || name.length > 80) throw new AuthError('invalid_input', i18n.t('auth:error.nameRange'), 400);
    const email = data.email?.trim().toLowerCase() || null;
    if (email && !isEmail(email)) throw new AuthError('invalid_email', i18n.t('auth:error.emailLooksWrong'), 400);
    if (email && findUserByEmail(email)) throw new AuthError('email_taken', i18n.t('auth:error.emailTakenSignup'), 409);
    const language = LANGUAGES.some((l) => l.id === data.language) ? data.language ?? 'en' : 'en';

    let user: StoredUser = {
      id: newUserId(),
      roles: [],
      activeRole: data.role,
      phone,
      phoneVerified: true,
      email,
      emailVerified: false,
      name,
      language,
      createdAt: now.toISOString(),
      hasPassword: false,
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
    if (data.role === ROLE.Provider && data.claim) {
      user = applyClaim(user, data.claim, now);
    } else if (data.role === ROLE.Rider) {
      if (!data.rider) throw new AuthError('invalid_input', i18n.t('auth:error.setUpRider'), 400);
      user = applyRiderSetup(user, data.rider);
    } else {
      // One signup path per role: customers and new providers use email + password.
      throw new AuthError('not_allowed', i18n.t('auth:error.useSignupForm'), 400);
    }
    return toUser(saveUser(user));
  } catch (e) {
    // Let them fix the form and try again without a new code.
    restoreSignupToken(data.signupToken, phone, now);
    throw e;
  }
}

/** POST /auth/signup/customer — creates the account and signs in; the email is verified next. */
export async function registerCustomer(input: CustomerSignupInput, { remember = true }: {remember?: boolean;} = {}): Promise<User> {
  const user = await mockResponse(() => toUser(registerCustomerNow(input, new Date())), 700, { auth: false });
  await startSession(user, remember);
  return user;
}

/** POST /auth/signup/provider — creates the account and signs in; the phone is verified next, then vendor setup. */
export async function registerProvider(input: ProviderSignupInput, { remember = true }: {remember?: boolean;} = {}): Promise<User> {
  const user = await mockResponse(() => toUser(registerProviderNow(input, new Date())), 700, { auth: false });
  await startSession(user, remember);
  return user;
}

/**
 * POST /auth/login/password — an email or a phone number in one field, and the password (customers and
 * providers). One message for any wrong combination; repeated failures are locked out for a while.
 */
export async function loginWithPassword(identifier: string, password: string, { remember = false }: {remember?: boolean;} = {}): Promise<User> {
  const user = await mockResponse(() => loginWithPasswordNow(identifier, password, new Date()), 700, { auth: false });
  await startSession(user, remember);
  return user;
}

/* ---------- Password reset by one-time code (rules: passwordResetConfig.ts) ---------- */

/**
 * POST /auth/password/otp { identifier } — a phone number (code by SMS) or an email (code by email).
 * Always the same answer, whether or not the account exists or has a password.
 */
export function requestPasswordResetOtp(identifier: string): Promise<PasswordResetOtpResult> {
  return mockResponse(() => requestResetOtpNow(identifier, currentDevice().id, new Date()), 600, { auth: false });
}

/** POST /auth/password/otp/verify { identifier, code } — returns a short-lived, one-use reset token. */
export function verifyPasswordResetOtp(identifier: string, code: string): Promise<PasswordResetVerifyResult> {
  return mockResponse(() => verifyResetOtpNow(identifier, code, new Date()), 500, { auth: false });
}

/**
 * POST /auth/password/reset { resetToken, newPassword } — every session of the account is signed out.
 * Then, per PASSWORD_RESET.afterReset, this device is signed in or sent to the login screen.
 */
export async function resetPassword(resetToken: string, newPassword: string): Promise<PasswordResetOutcome> {
  const user = await mockResponse(() => toUser(resetPasswordNow(resetToken, newPassword, new Date())), 700, { auth: false });
  if (PASSWORD_RESET.afterReset !== 'sign_in') return { status: 'go_to_login' };
  await startSession(user, false);
  return { status: 'signed_in', user };
}

/**
 * POST /auth/logout — revokes this session on the server, then clears this browser (memory, flag, cookie,
 * cached private data, app state) and signs out the other tabs. Callers go to the login screen.
 */
export function logout(): Promise<void> {
  return signOutHere();
}

/* ---------- Shared by the account service ---------- */

/** After a successful sign-in: a new session for this device. */
async function startSession(user: User, remember: boolean) {
  const stored = findUser(user.id);
  if (stored) restoreProviderProfile(stored, new Date());
  await createSession(user, currentDevice(), { remember });
}

/** Inside a request: the caller's stored record (MOCK backend side), from the access token, or a 401. */
export function sessionRecord(): StoredUser {
  return requestSession().user;
}

/** After an account change: save it and refresh the session's copy. */
export function commitUser(user: StoredUser): User {
  const saved = saveUser(user);
  const publicUser = toUser(saved);
  updateSessionUser(publicUser);
  return publicUser;
}
