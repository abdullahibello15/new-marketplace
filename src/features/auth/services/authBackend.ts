import i18n from '../../../i18n';
import { addMinutes, addSeconds, differenceInSeconds } from 'date-fns';
import { normalizeNigerianPhone, phoneError } from '../../../utils/phone';
import { EMAIL_CODE, EMAIL_LOGIN_LIMIT, OTP, PASSWORD, ROLE } from '../constants';
import { MOCK_AUTH, MOCK_NETWORK_FAILURE_SUFFIX, MOCK_OTP_CODE } from '../config';
import { AuthError } from '../errors';
import { seedUsers, type StoredUser } from '../mock/users';
import type { OtpRequestResult, User, VerifyOtpResult } from '../types';

/*
 * MOCK auth backend: what a real server would hold and check. Kept in this browser:
 *  - users: persisted in localStorage as the mock server's "database" (so accounts made in the demo survive
 *    a reload). A real backend keeps these server-side, of course;
 *  - one-time codes, signup tokens, sessions, reset tokens and rate limits: memory only.
 * Everything here is sync and takes `now`, so it's testable; authService.ts wraps it in Promises.
 */

const DB_KEY = 'gwani:mock-auth-db:v1';

/** MOCK hash (NOT secure): a real backend uses a slow salted hash (argon2/bcrypt) and never sends it out. */
export function mockHash(password: string): string {
  let h = 2166136261;
  for (const ch of `gwani-mock-salt:${password}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `mock$${(h >>> 0).toString(36)}`;
}

function loadUsers(): Map<string, StoredUser> {
  const map = new Map(seedUsers(mockHash).map((u) => [u.id, u]));
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) for (const u of JSON.parse(raw) as StoredUser[]) map.set(u.id, u);
  } catch {
    // Storage blocked or corrupt: start from the seed accounts.
  }
  return map;
}

let users: Map<string, StoredUser> | null = null;
const db = () => users ??= loadUsers();

function persist() {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify([...db().values()]));
  } catch {
    // Not persisted; accounts last until reload.
  }
}

export function toUser(stored: StoredUser): User {
  // Server-only fields never leave the backend.
  const user: Partial<StoredUser> = { ...stored };
  delete user.passwordHash;
  delete user.vendorDraft;
  return user as User;
}

export const findUser = (id: string) => db().get(id) ?? null;
export const findUserByPhone = (phone: string) => [...db().values()].find((u) => u.phone === phone) ?? null;
/** The account that owns a vendor profile, if any (to send that vendor messages in their language). */
export const findUserByVendorId = (vendorId: string) => [...db().values()].find((u) => u.vendorId === vendorId) ?? null;
export const findUserByEmail = (email: string) => [...db().values()].find((u) => u.email?.toLowerCase() === email.trim().toLowerCase()) ?? null;

export function saveUser(user: StoredUser): StoredUser {
  db().set(user.id, user);
  persist();
  return user;
}

let nextId = 1;
export const newUserId = () => `usr-${Date.now().toString(36)}-${nextId++}`;

function randomToken(bytes = 24): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomDigits(length: number): string {
  const a = new Uint32Array(length);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => String(n % 10)).join('');
}

/* ---------- Dev outbox: what a real backend would send by SMS or email (dev banner only) ---------- */

export interface DevMessage {
  id: number;
  kind: 'otp' | 'email_code' | 'reset_link';
  to: string;
  text: string;
  /** A code or a link path, to copy. */
  value: string;
  at: string;
}

let outbox: DevMessage[] = [];
let nextMessage = 1;
const outboxListeners = new Set<() => void>();

/** Only records anything in mock mode (dev server); production never has this. */
function devSend(message: Omit<DevMessage, 'id' | 'at'>, now: Date) {
  if (!MOCK_AUTH) return;
  outbox = [{ ...message, id: nextMessage++, at: now.toISOString() }, ...outbox].slice(0, 10);
  outboxListeners.forEach((l) => l());
}

export const devOutbox = () => outbox;
export function subscribeDevOutbox(listener: () => void) {
  outboxListeners.add(listener);
  return () => {
    outboxListeners.delete(listener);
  };
}

/* ---------- Sessions ---------- */

const sessions = new Map<string, string>();

export function issueSession(userId: string): string {
  const token = randomToken();
  sessions.set(token, userId);
  return token;
}

export const userForToken = (token: string | null) => token ? findUser(sessions.get(token) ?? '') : null;
export const endSession = (token: string | null) => token && sessions.delete(token);

/* ---------- One-time codes ---------- */

interface Challenge {
  code: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  attempts: number;
}

const challenges = new Map<string, Challenge>();
const lockedUntil = new Map<string, Date>();
const signupTokens = new Map<string, {phone: string;expiresAt: Date;}>();

const minutesText = (seconds: number) => i18n.t('auth:otp.minutes', { count: Math.ceil(seconds / 60) });

export function normalizeOrThrow(raw: string): string {
  const phone = normalizeNigerianPhone(raw);
  if (!phone) throw new AuthError('invalid_phone', phoneError(raw) ?? i18n.t('common:phone.invalid'), 400);
  return phone;
}

function assertNotLocked(phone: string, now: Date) {
  const until = lockedUntil.get(phone);
  if (until && until > now) {
    const seconds = differenceInSeconds(until, now);
    throw new AuthError('locked', i18n.t('auth:error.locked', { time: minutesText(seconds) }), 429, { retryAfterSeconds: seconds });
  }
}

/** POST /auth/otp — sends a 6-digit code by SMS. */
export function requestOtpNow(raw: string, now: Date): OtpRequestResult {
  const phone = normalizeOrThrow(raw);
  if (MOCK_AUTH && phone.endsWith(MOCK_NETWORK_FAILURE_SUFFIX)) throw new TypeError('Failed to fetch (mock network failure)');
  assertNotLocked(phone, now);
  const existing = challenges.get(phone);
  if (existing && existing.resendAvailableAt > now) {
    const seconds = differenceInSeconds(existing.resendAvailableAt, now);
    throw new AuthError('resend_too_soon', i18n.t('auth:error.resendTooSoon', { count: seconds }), 429, { retryAfterSeconds: seconds });
  }
  // The fixed test code only exists in mock mode (dev server); otherwise it's random, as in production.
  const code = MOCK_AUTH ? MOCK_OTP_CODE : randomDigits(OTP.length);
  const challenge: Challenge = { code, expiresAt: addMinutes(now, OTP.expiresMinutes), resendAvailableAt: addSeconds(now, OTP.resendSeconds), attempts: 0 };
  challenges.set(phone, challenge);
  devSend({ kind: 'otp', to: phone, text: `Your Gwani code is ${code}. It expires in ${OTP.expiresMinutes} minutes.`, value: code }, now);
  return { phone, expiresAt: challenge.expiresAt.toISOString(), resendAvailableAt: challenge.resendAvailableAt.toISOString(), devCode: MOCK_AUTH ? code : null };
}

/**
 * Checks a code. Right: the challenge is used up and the number counts as verified. Wrong: one attempt
 * used; after OTP.maxAttempts the number is locked for a while. Returns the verified phone.
 */
export function checkOtpNow(raw: string, code: string, now: Date): string {
  const phone = normalizeOrThrow(raw);
  assertNotLocked(phone, now);
  const c = challenges.get(phone);
  if (!c) throw new AuthError('no_code', i18n.t('auth:error.noCode'), 400);
  if (c.expiresAt <= now) {
    challenges.delete(phone);
    throw new AuthError('expired', i18n.t('auth:error.expired'), 410);
  }
  if (code.trim() !== c.code) {
    c.attempts += 1;
    if (c.attempts >= OTP.maxAttempts) {
      challenges.delete(phone);
      lockedUntil.set(phone, addMinutes(now, OTP.lockoutMinutes));
      throw new AuthError('locked', i18n.t('auth:error.lockedNow', { time: minutesText(OTP.lockoutMinutes * 60) }), 429, { retryAfterSeconds: OTP.lockoutMinutes * 60 });
    }
    const left = OTP.maxAttempts - c.attempts;
    throw new AuthError('wrong_code', i18n.t('auth:error.wrongCode', { count: left }), 400, { attemptsLeft: left });
  }
  challenges.delete(phone);
  return phone;
}

/**
 * EXTENSION POINT (2FA): staff will need a second factor after the phone code (an authenticator app or
 * a security key). When that exists, set STAFF_SECOND_FACTOR, return a "second factor required" result
 * from verifyOtpNow instead of a session, and finish sign-in only after the second step.
 */
type SecondFactor = 'totp' | 'webauthn';
const STAFF_SECOND_FACTOR: SecondFactor | null = null;

export function secondFactorFor(user: StoredUser): SecondFactor | null {
  return user.roles.includes(ROLE.Admin) ? STAFF_SECOND_FACTOR : null;
}

/** POST /auth/otp/verify — signs in a known number, or starts signup for a new one. */
export function verifyOtpNow(raw: string, code: string, now: Date): {result: VerifyOtpResult;token: string | null;} {
  const phone = checkOtpNow(raw, code, now);
  const existing = findUserByPhone(phone);
  if (existing) {
    secondFactorFor(existing);
    const user = saveUser({ ...existing, phoneVerified: true });
    return { result: { status: 'signed_in', user: toUser(user) }, token: issueSession(user.id) };
  }
  const signupToken = randomToken();
  const expiresAt = addMinutes(now, OTP.signupWindowMinutes);
  signupTokens.set(signupToken, { phone, expiresAt });
  return { result: { status: 'new_user', phone, signupToken, expiresAt: expiresAt.toISOString() }, token: null };
}

/** The phone a signup token was issued for (it's used up). */
export function consumeSignupToken(token: string, now: Date): string {
  const t = signupTokens.get(token);
  if (!t || t.expiresAt <= now) throw new AuthError('signup_expired', i18n.t('auth:error.signupExpired'), 410);
  signupTokens.delete(token);
  return t.phone;
}

/** Signup can fail on later checks (e.g. the vendor setup); let them retry with the same token. */
export function restoreSignupToken(token: string, phone: string, now: Date) {
  signupTokens.set(token, { phone, expiresAt: addMinutes(now, OTP.signupWindowMinutes) });
}

/** For signup forms that need the verified number before the account exists (e.g. the claim check). */
export function peekSignupToken(token: string, now: Date): string | null {
  const t = signupTokens.get(token);
  return t && t.expiresAt > now ? t.phone : null;
}

/* ---------- Email + password (customers only) ---------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (raw: string) => EMAIL.test(raw.trim());

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD.minLength) return i18n.t('auth:error.passwordMin', { min: PASSWORD.minLength });
  if (password.length > PASSWORD.maxLength) return i18n.t('auth:error.passwordMax', { max: PASSWORD.maxLength });
  return null;
}

const failures = new Map<string, {count: number;firstAt: Date;lockedUntil: Date | null;}>();

/**
 * POST /auth/login/email. Customer-only accounts that have set a password. The same message for an
 * unknown email, a wrong password, or an account that must use its phone, so nobody can find out
 * whether an email is registered. Failed attempts per email are rate-limited.
 */
export function loginWithEmailNow(rawEmail: string, password: string, now: Date): {user: User;token: string;} {
  const email = rawEmail.trim().toLowerCase();
  const f = failures.get(email);
  if (f?.lockedUntil && f.lockedUntil > now) {
    const seconds = differenceInSeconds(f.lockedUntil, now);
    throw new AuthError('rate_limited', i18n.t('auth:error.rateLimited', { time: minutesText(seconds) }), 429, { retryAfterSeconds: seconds });
  }
  const user = isEmail(email) ? findUserByEmail(email) : null;
  const customerOnly = !!user && user.roles.length === 1 && user.roles[0] === ROLE.Customer;
  const ok = !!user && customerOnly && user.emailVerified && !!user.passwordHash && user.passwordHash === mockHash(password);
  if (!ok || !user) {
    const windowStart = f && addMinutes(f.firstAt, EMAIL_LOGIN_LIMIT.windowMinutes) > now ? f : { count: 0, firstAt: now, lockedUntil: null };
    const count = windowStart.count + 1;
    failures.set(email, { count, firstAt: windowStart.firstAt, lockedUntil: count >= EMAIL_LOGIN_LIMIT.maxFailures ? addMinutes(now, EMAIL_LOGIN_LIMIT.lockoutMinutes) : null });
    throw new AuthError('invalid_credentials', i18n.t('auth:error.invalidCredentials'), 401);
  }
  failures.delete(email);
  return { user: toUser(user), token: issueSession(user.id) };
}

/* ---------- Email verification and password reset ---------- */

const emailCodes = new Map<string, {email: string;code: string;expiresAt: Date;}>();
const resetTokens = new Map<string, {userId: string;expiresAt: Date;}>();

export function startEmailVerification(user: StoredUser, rawEmail: string, now: Date) {
  const email = rawEmail.trim().toLowerCase();
  if (!isEmail(email)) throw new AuthError('invalid_email', i18n.t('auth:error.invalidEmail'), 400);
  const owner = findUserByEmail(email);
  if (owner && owner.id !== user.id) throw new AuthError('email_taken', i18n.t('auth:error.emailTaken'), 409);
  const code = MOCK_AUTH ? MOCK_OTP_CODE : randomDigits(EMAIL_CODE.length);
  emailCodes.set(user.id, { email, code, expiresAt: addMinutes(now, EMAIL_CODE.expiresMinutes) });
  devSend({ kind: 'email_code', to: email, text: `Your Gwani email code is ${code}.`, value: code }, now);
  return saveUser({ ...user, email, emailVerified: false });
}

export function finishEmailVerification(user: StoredUser, code: string, now: Date) {
  const pending = emailCodes.get(user.id);
  if (!pending || pending.expiresAt <= now) throw new AuthError('expired', i18n.t('auth:error.emailCodeExpired'), 410);
  if (pending.email !== user.email) throw new AuthError('invalid_input', i18n.t('auth:error.emailChanged'), 409);
  if (code.trim() !== pending.code) throw new AuthError('wrong_code', i18n.t('auth:error.emailCodeWrong'), 400);
  emailCodes.delete(user.id);
  return saveUser({ ...user, emailVerified: true });
}

/** Always answers the same way, whether or not the email has an account. */
export function startPasswordReset(rawEmail: string, now: Date) {
  const user = findUserByEmail(rawEmail);
  if (!user || !user.emailVerified || !user.roles.every((r) => r === ROLE.Customer)) return;
  const token = randomToken();
  resetTokens.set(token, { userId: user.id, expiresAt: addMinutes(now, EMAIL_CODE.resetLinkMinutes) });
  devSend({ kind: 'reset_link', to: user.email as string, text: 'Reset your Gwani password', value: `/reset-password/${token}` }, now);
}

export function finishPasswordReset(token: string, password: string, now: Date) {
  const t = resetTokens.get(token);
  if (!t || t.expiresAt <= now) throw new AuthError('invalid_token', i18n.t('auth:error.resetLinkExpired'), 410);
  const problem = passwordProblem(password);
  if (problem) throw new AuthError('weak_password', problem, 400);
  const user = findUser(t.userId);
  if (!user) throw new AuthError('invalid_token', i18n.t('auth:error.resetLinkInvalid'), 410);
  resetTokens.delete(token);
  failures.delete((user.email ?? '').toLowerCase());
  saveUser({ ...user, passwordHash: mockHash(password), hasPassword: true });
}

/** Test helper: forget the in-memory state (codes, locks, sessions). */
export function resetAuthBackendForTests() {
  users = null;
  challenges.clear();
  lockedUntil.clear();
  signupTokens.clear();
  sessions.clear();
  failures.clear();
  emailCodes.clear();
  resetTokens.clear();
  outbox = [];
}
