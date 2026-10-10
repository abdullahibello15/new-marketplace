import i18n from '../../../i18n';
import { mockResponse } from '../../../services/mockApi';
import { LANGUAGES, ROLE } from '../constants';
import { AuthError } from '../errors';
import { clearSession, currentAccessToken, getAuthSnapshot, readSessionFlag, setSession } from '../session';
import {
  consumeSignupToken,
  findUser,
  findUserByEmail,
  findUserByPhone,
  isEmail,
  issueSession,
  endSession,
  loginWithEmailNow,
  newUserId,
  requestOtpNow,
  restoreSignupToken,
  saveUser,
  toUser,
  userForToken,
  verifyOtpNow } from
'./authBackend';
import { applyClaim, applyProviderSetup, applyRiderSetup, restoreProviderProfile } from './roleSetup';
import type { StoredUser } from '../mock/users';
import type { OtpRequestResult, RegisterInput, User, VerifyOtpResult } from '../types';

/*
 * The auth API, with the signatures a real backend would have. All mocked (authBackend.ts holds the
 * "server"), all Promise-based. Each call that signs someone in or changes their account updates the
 * session (session.ts), which AuthProvider and every service read.
 */

/** POST /auth/otp { phone } — sends a one-time code by SMS. Accepts +234…, 0…, 234… or 803… formats. */
export function requestOtp(phone: string): Promise<OtpRequestResult> {
  return mockResponse(() => requestOtpNow(phone, new Date()), 600);
}

/**
 * POST /auth/otp/verify { phone, code } — a known number is signed in (no duplicate account is ever
 * created); a new one gets a short-lived signup token for registerUser.
 */
export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const { result, token } = await mockResponse(() => verifyOtpNow(phone, code, new Date()), 500);
  if (result.status === 'signed_in' && token) signIn(result.user, token);
  return result;
}

/** POST /auth/register — creates the account for a verified number, with the chosen role's setup, and signs in. */
export async function registerUser(data: RegisterInput): Promise<User> {
  const { user, token } = await mockResponse(() => registerNow(data, new Date()), 700);
  signIn(user, token);
  return user;
}

function registerNow(data: RegisterInput, now: Date): {user: User;token: string;} {
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
      vendorId: null,
      rider: null,
      address: null,
      area: null,
      passwordHash: null,
      vendorDraft: null
    };
    if (data.role === ROLE.Provider) {
      if (data.claim) user = applyClaim(user, data.claim, now);else
      if (data.vendor) user = applyProviderSetup(user, data.vendor, now);else
      throw new AuthError('invalid_input', i18n.t('auth:error.setUpBusiness'), 400);
    } else if (data.role === ROLE.Rider) {
      if (!data.rider) throw new AuthError('invalid_input', i18n.t('auth:error.setUpRider'), 400);
      user = applyRiderSetup(user, data.rider);
    } else {
      user = { ...user, roles: [ROLE.Customer], activeRole: ROLE.Customer };
    }
    const saved = saveUser(user);
    return { user: toUser(saved), token: issueSession(saved.id) };
  } catch (e) {
    // Let them fix the form and try again without a new code.
    restoreSignupToken(data.signupToken, phone, now);
    throw e;
  }
}

/** POST /auth/login/email — customers only, and only once they've verified an email and set a password. */
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { user, token } = await mockResponse(() => loginWithEmailNow(email, password, new Date()), 700);
  signIn(user, token);
  return user;
}

/** POST /auth/logout */
export async function logout(): Promise<void> {
  const token = currentAccessToken();
  await mockResponse(() => {
    endSession(token);
  }, 200);
  clearSession();
}

/** GET /auth/me — who the current session belongs to. */
export function getCurrentUser(): Promise<User | null> {
  const token = currentAccessToken();
  return mockResponse(() => {
    const user = userForToken(token);
    return user ? toUser(user) : null;
  }, 200);
}

/**
 * POST /auth/refresh — restores the session after a reload. MOCK: reads the persisted flag (a real
 * backend reads its httpOnly refresh cookie instead) and issues a new in-memory access token.
 */
export async function refreshSession(): Promise<User | null> {
  const flag = readSessionFlag();
  try {
    const restored = await mockResponse(() => {
      const user = flag ? findUser(flag.userId) : null;
      if (!user) return null;
      restoreProviderProfile(user, new Date());
      const role = user.roles.includes(flag?.activeRole ?? user.activeRole) ? flag?.activeRole ?? user.activeRole : user.activeRole;
      const saved = saveUser({ ...user, activeRole: role });
      return { user: toUser(saved), token: issueSession(saved.id) };
    }, 150);
    if (!restored) {
      clearSession();
      return null;
    }
    signIn(restored.user, restored.token);
    return restored.user;
  } catch {
    clearSession();
    return null;
  }
}

/* ---------- Shared by the account service ---------- */

function signIn(user: User, token: string) {
  const stored = findUser(user.id);
  if (stored) restoreProviderProfile(stored, new Date());
  setSession(user, token);
}

/** The signed-in user's stored record (MOCK backend side), or a 401. */
export function sessionRecord(): StoredUser {
  const user = userForToken(currentAccessToken()) ?? (getAuthSnapshot().user ? findUser(getAuthSnapshot().user?.id ?? '') : null);
  if (!user) throw new AuthError('not_signed_in', i18n.t('auth:error.notSignedIn'), 401);
  return user;
}

/** After an account change: save it and refresh the session's copy. */
export function commitUser(user: StoredUser): User {
  const saved = saveUser(user);
  const publicUser = toUser(saved);
  setSession(publicUser);
  return publicUser;
}
