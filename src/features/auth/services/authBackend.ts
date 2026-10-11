import i18n from '../../../i18n';
import { addMinutes, addSeconds, differenceInSeconds } from 'date-fns';
import { normalizeNigerianPhone, phoneError } from '../../../utils/phone';
import { EMAIL_CODE, OTP, PASSWORD, PASSWORD_LOGIN_LIMIT, ROLE } from '../constants';
import { MOCK_AUTH, MOCK_NETWORK_FAILURE_SUFFIX, MOCK_OTP_CODE } from '../config';
import { AuthError } from '../errors';
import { seedUsers, type StoredUser } from '../mock/users';
import { ADMIN_ROLE, isAdminRole } from '../../admin/config/roles';
import { randomDigits, randomToken } from '../utils/random';
import { endUserSessionsNow } from './sessionBackend';
import type { OtpRequestResult, SessionEndReason, User, VerifyOtpResult } from '../types';

export { randomDigits, randomToken };

/*
 * MOCK auth backend: what a real server would hold and check. Kept in this browser:
 *  - users: persisted in localStorage as the mock server's "database" (so accounts made in the demo survive
 *    a reload). A real backend keeps these server-side, of course;
 *  - one-time codes, signup tokens and rate limits: memory only (password reset: passwordResetBackend.ts;
 *    sessions and tokens: sessionBackend.ts).
 * Everything here is sync and takes `now`, so it's testable; authService.ts wraps it in Promises.
 */

/** v2: the demo accounts moved to fake +234 800 000 00xx numbers; older saved copies are ignored. */
const DB_KEY = 'gwani:mock-auth-db:v2';

/**
 * MOCK placeholder hash (NOT secure). Passwords are never stored or logged in plain text, even here; a
 * real backend hashes them server-side with a slow salted hash (argon2id or bcrypt) and never sends the
 * hash out.
 */
export function mockHash(password: string): string {
  let h = 2166136261;
  for (const ch of `gwani-mock-salt:${password}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `mock$${(h >>> 0).toString(36)}`;
}

/** Accounts saved by older versions lack the newer staff fields; staff roles that no longer exist fall back to the seed's (or Verifier). */
function upgrade(u: StoredUser, seed: StoredUser | undefined): StoredUser {
  const adminRole = !u.roles.includes(ROLE.Admin) ? null : isAdminRole(u.adminRole) ? u.adminRole : seed?.adminRole ?? ADMIN_ROLE.Verifier;
  return { ...u, adminRole, adminSuspendedAt: u.adminSuspendedAt ?? null, adminAddedBy: u.adminAddedBy ?? null, lastLoginAt: u.lastLoginAt ?? null };
}

function loadUsers(): Map<string, StoredUser> {
  const seeds = new Map(seedUsers(mockHash).map((u) => [u.id, u]));
  const map = new Map(seeds);
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) for (const u of JSON.parse(raw) as StoredUser[]) map.set(u.id, upgrade(u, seeds.get(u.id)));
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
/** '' means "no phone" (customers sign up with an email), so it never matches anyone. */
export const findUserByPhone = (phone: string) => phone ? [...db().values()].find((u) => u.phone === phone) ?? null : null;
/** The account that owns a vendor profile, if any (to send that vendor messages in their language). */
export const findUserByVendorId = (vendorId: string) => [...db().values()].find((u) => u.vendorId === vendorId) ?? null;
export const findUserByEmail = (email: string) => email.trim() ? [...db().values()].find((u) => u.email?.toLowerCase() === email.trim().toLowerCase()) ?? null : null;

/**
 * Customers see a vendor only once its owner has verified their phone. Directory vendors without an
 * account here (seeded, or invited by an association) are shown as before.
 */
export function isVendorPublic(vendorId: string): boolean {
  const owner = findUserByVendorId(vendorId);
  return !owner || owner.phoneVerified;
}

/** Deleting is for staff accounts only (from the Admins page). */
export function deleteUser(id: string): void {
  db().delete(id);
  endUserSessionsNow(id, 'account_suspended', new Date());
  persist();
}

export const allUsers = () => [...db().values()];

/** Ends every session of one account on the server at once (suspension, removal, password reset). */
export function endSessionsFor(userId: string, reason: SessionEndReason = 'account_suspended'): void {
  endUserSessionsNow(userId, reason, new Date());
}

/** A suspended staff account can't sign in or keep using an existing session. */
export const isSuspended = (user: Pick<StoredUser, 'adminSuspendedAt'>) => Boolean(user.adminSuspendedAt);
const suspendedError = () => new AuthError('account_suspended', i18n.t('auth:error.accountSuspended'), 403);

export function saveUser(user: StoredUser): StoredUser {
  db().set(user.id, user);
  persist();
  return user;
}

let nextId = 1;
export const newUserId = () => `usr-${Date.now().toString(36)}-${nextId++}`;

/* ---------- Dev outbox: what a real backend would send by SMS or email (dev banner only) ---------- */

export interface DevMessage {
  id: number;
  /** reset_code: a password-reset code; security_notice: "your password was changed" (SMS or email). */
  kind: 'otp' | 'email_code' | 'reset_code' | 'security_notice';
  to: string;
  text: string;
  /** The code, to copy ('' for notices). */
  value: string;
  at: string;
}

let outbox: DevMessage[] = [];
let nextMessage = 1;
const outboxListeners = new Set<() => void>();

/** Only records anything in mock mode (dev server); production never has this. */
export function devSend(message: Omit<DevMessage, 'id' | 'at'>, now: Date) {
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

/* ---------- One-time codes ---------- */

export const minutesText = (seconds: number) => i18n.t('auth:otp.minutes', { count: Math.ceil(seconds / 60) });

export interface OtpRules {
  length: number;
  expiresMinutes: number;
  resendSeconds: number;
  maxAttempts: number;
  lockoutMinutes: number;
  /** Codes that can be sent per key in any rolling hour after the first (null: no cap). */
  resendsPerHour: number | null;
  /** i18n keys for "still locked for {{time}}" and "locked now for {{time}}". */
  lockedKey: string;
  lockedNowKey: string;
}

interface Challenge {
  /** Null for a decoy: nothing was sent, so no code can match (see createOtpStore). */
  code: string | null;
  expiresAt: Date;
  resendAvailableAt: Date;
  attempts: number;
}

/**
 * THE one-time-code rules, shared by phone sign-in and password reset: expiry, one use, the resend
 * timer, an optional hourly cap, wrong-attempt counting and the lockout. Keys are whatever the caller
 * verifies (an E.164 phone, a lower-case email).
 */
export function createOtpStore(rules: OtpRules) {
  const challenges = new Map<string, Challenge>();
  const lockedUntil = new Map<string, Date>();
  const sentAt = new Map<string, Date[]>();

  function assertNotLocked(key: string, now: Date) {
    const until = lockedUntil.get(key);
    if (until && until > now) {
      const seconds = differenceInSeconds(until, now);
      throw new AuthError('locked', i18n.t(rules.lockedKey, { time: minutesText(seconds) }), 429, { retryAfterSeconds: seconds });
    }
  }

  /**
   * Starts (or replaces) the challenge for `key`. A decoy behaves the same to the caller (timers, limits,
   * lockout) but has no code, for answers that mustn't reveal whether an account exists.
   */
  function issue(key: string, now: Date, { decoy = false }: {decoy?: boolean;} = {}): Challenge {
    assertNotLocked(key, now);
    const existing = challenges.get(key);
    if (existing && existing.resendAvailableAt > now) {
      const seconds = differenceInSeconds(existing.resendAvailableAt, now);
      throw new AuthError('resend_too_soon', i18n.t('auth:error.resendTooSoon', { count: seconds }), 429, { retryAfterSeconds: seconds });
    }
    const recent = (sentAt.get(key) ?? []).filter((at) => addMinutes(at, 60) > now);
    if (rules.resendsPerHour !== null && recent.length > rules.resendsPerHour) {
      const seconds = differenceInSeconds(addMinutes(recent[0], 60), now);
      throw new AuthError('resend_limit', i18n.t('auth:error.resendLimit', { time: minutesText(seconds) }), 429, { retryAfterSeconds: seconds });
    }
    sentAt.set(key, [...recent, now]);
    // The fixed test code only exists in mock mode (dev server); otherwise it's random, as in production.
    const code = decoy ? null : MOCK_AUTH ? MOCK_OTP_CODE : randomDigits(rules.length);
    const challenge: Challenge = { code, expiresAt: addMinutes(now, rules.expiresMinutes), resendAvailableAt: addSeconds(now, rules.resendSeconds), attempts: 0 };
    challenges.set(key, challenge);
    return challenge;
  }

  /** Right code: the challenge is used up. Wrong: one attempt used; at the maximum the key is locked. */
  function check(key: string, code: string, now: Date): void {
    assertNotLocked(key, now);
    const c = challenges.get(key);
    if (!c) throw new AuthError('no_code', i18n.t('auth:error.noCode'), 400);
    if (c.expiresAt <= now) {
      challenges.delete(key);
      throw new AuthError('expired', i18n.t('auth:error.expired'), 410);
    }
    if (c.code === null || code.trim() !== c.code) {
      c.attempts += 1;
      if (c.attempts >= rules.maxAttempts) {
        challenges.delete(key);
        lockedUntil.set(key, addMinutes(now, rules.lockoutMinutes));
        throw new AuthError('locked', i18n.t(rules.lockedNowKey, { time: minutesText(rules.lockoutMinutes * 60) }), 429, { retryAfterSeconds: rules.lockoutMinutes * 60 });
      }
      const left = rules.maxAttempts - c.attempts;
      throw new AuthError('wrong_code', i18n.t('auth:error.wrongCode', { count: left }), 400, { attemptsLeft: left });
    }
    challenges.delete(key);
  }

  function clear() {
    challenges.clear();
    lockedUntil.clear();
    sentAt.clear();
  }

  return { issue, check, clear };
}

const loginOtp = createOtpStore({ ...OTP, resendsPerHour: null, lockedKey: 'auth:error.locked', lockedNowKey: 'auth:error.lockedNow' });
const signupTokens = new Map<string, {phone: string;expiresAt: Date;}>();

export function normalizeOrThrow(raw: string): string {
  const phone = normalizeNigerianPhone(raw);
  if (!phone) throw new AuthError('invalid_phone', phoneError(raw) ?? i18n.t('common:phone.invalid'), 400);
  return phone;
}

/** MOCK mode only: numbers ending in MOCK_NETWORK_FAILURE_SUFFIX fail like a dropped connection. */
export function simulateNetworkFailure(phone: string) {
  if (MOCK_AUTH && phone.endsWith(MOCK_NETWORK_FAILURE_SUFFIX)) throw new TypeError('Failed to fetch (mock network failure)');
}

/** POST /auth/otp — sends a 6-digit code by SMS. */
export function requestOtpNow(raw: string, now: Date): OtpRequestResult {
  const phone = normalizeOrThrow(raw);
  simulateNetworkFailure(phone);
  const challenge = loginOtp.issue(phone, now);
  const code = challenge.code ?? '';
  devSend({ kind: 'otp', to: phone, text: `Your Gwani code is ${code}. It expires in ${OTP.expiresMinutes} minutes.`, value: code }, now);
  return { phone, expiresAt: challenge.expiresAt.toISOString(), resendAvailableAt: challenge.resendAvailableAt.toISOString(), devCode: MOCK_AUTH ? code : null };
}

/**
 * Checks a code. Right: the challenge is used up and the number counts as verified. Wrong: one attempt
 * used; after OTP.maxAttempts the number is locked for a while. Returns the verified phone.
 */
export function checkOtpNow(raw: string, code: string, now: Date): string {
  const phone = normalizeOrThrow(raw);
  loginOtp.check(phone, code, now);
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

/** POST /auth/otp/verify — a known number is signed in (the caller then starts a session); a new one starts signup. */
export function verifyOtpNow(raw: string, code: string, now: Date): VerifyOtpResult {
  const phone = checkOtpNow(raw, code, now);
  const existing = findUserByPhone(phone);
  if (existing) {
    if (isSuspended(existing)) throw suspendedError();
    secondFactorFor(existing);
    const user = saveUser({ ...existing, phoneVerified: true, lastLoginAt: now.toISOString() });
    return { status: 'signed_in', user: toUser(user) };
  }
  const signupToken = randomToken();
  const expiresAt = addMinutes(now, OTP.signupWindowMinutes);
  signupTokens.set(signupToken, { phone, expiresAt });
  return { status: 'new_user', phone, signupToken, expiresAt: expiresAt.toISOString() };
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

/* ---------- Passwords (customers and providers) ---------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (raw: string) => EMAIL.test(raw.trim());

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD.minLength) return i18n.t('auth:error.passwordMin', { min: PASSWORD.minLength });
  if (password.length > PASSWORD.maxLength) return i18n.t('auth:error.passwordMax', { max: PASSWORD.maxLength });
  return null;
}

/** An email (lower case) or a phone (E.164) from "one field that accepts either"; null if it's neither. */
export function identifierKey(raw: string): string | null {
  const value = raw.trim();
  if (value.includes('@')) return isEmail(value) ? value.toLowerCase() : null;
  return normalizeNigerianPhone(value);
}

export function findUserByIdentifier(raw: string): StoredUser | null {
  const key = identifierKey(raw);
  if (!key) return null;
  return key.includes('@') ? findUserByEmail(key) : findUserByPhone(key);
}

const failures = new Map<string, {count: number;firstAt: Date;lockedUntil: Date | null;}>();

/**
 * POST /auth/login/password { identifier, password } — an email or a phone number, and the password.
 * The same message for an unknown email or phone, a wrong password, or an account without a password
 * (riders and staff use phone codes), so nobody can find out who is registered. Failed attempts per
 * identifier are rate-limited, then locked for a while (PASSWORD_LOGIN_LIMIT).
 */
export function loginWithPasswordNow(identifier: string, password: string, now: Date): User {
  const key = identifierKey(identifier) ?? identifier.trim().toLowerCase();
  const f = failures.get(key);
  if (f?.lockedUntil && f.lockedUntil > now) {
    const seconds = differenceInSeconds(f.lockedUntil, now);
    throw new AuthError('rate_limited', i18n.t('auth:error.rateLimited', { time: minutesText(seconds) }), 429, { retryAfterSeconds: seconds });
  }
  const user = findUserByIdentifier(identifier);
  const ok = !!user && !isSuspended(user) && !!user.passwordHash && user.passwordHash === mockHash(password);
  if (!ok || !user) {
    const windowStart = f && addMinutes(f.firstAt, PASSWORD_LOGIN_LIMIT.windowMinutes) > now ? f : { count: 0, firstAt: now, lockedUntil: null };
    const count = windowStart.count + 1;
    failures.set(key, { count, firstAt: windowStart.firstAt, lockedUntil: count >= PASSWORD_LOGIN_LIMIT.maxFailures ? addMinutes(now, PASSWORD_LOGIN_LIMIT.lockoutMinutes) : null });
    throw new AuthError('invalid_credentials', i18n.t('auth:error.invalidCredentials'), 401);
  }
  failures.delete(key);
  const signedIn = saveUser({ ...user, lastLoginAt: now.toISOString() });
  return toUser(signedIn);
}

/** After a password change: past failures for that account's email and phone no longer count. */
export function clearPasswordLoginFailures(user: Pick<StoredUser, 'email' | 'phone'>) {
  if (user.email) failures.delete(user.email.toLowerCase());
  if (user.phone) failures.delete(user.phone);
}

/** Signup: one account per email (case-insensitive). The message only says to log in instead. */
export function assertEmailFree(email: string, exceptUserId: string | null = null) {
  const owner = findUserByEmail(email);
  if (owner && owner.id !== exceptUserId) throw new AuthError('email_taken', i18n.t('auth:error.emailInUse'), 409);
}

/** Signup: one account per phone number. */
export function assertPhoneFree(phone: string, exceptUserId: string | null = null) {
  const owner = findUserByPhone(phone);
  if (owner && owner.id !== exceptUserId) throw new AuthError('phone_taken', i18n.t('auth:error.phoneInUse'), 409);
}

/* ---------- Verifying an email or a phone (6-digit codes) ---------- */

/** Email codes: the same rules as SMS codes (one use, attempts, lockout, resend timer), a longer expiry. */
const emailOtp = createOtpStore({
  length: EMAIL_CODE.length,
  expiresMinutes: EMAIL_CODE.expiresMinutes,
  resendSeconds: OTP.resendSeconds,
  maxAttempts: OTP.maxAttempts,
  lockoutMinutes: OTP.lockoutMinutes,
  resendsPerHour: EMAIL_CODE.resendsPerHour,
  lockedKey: 'auth:error.emailLocked',
  lockedNowKey: 'auth:error.emailLockedNow'
});

export interface CodeSent {
  target: string;
  expiresAt: string;
  resendAvailableAt: string;
  /** Mock mode only (dev server): the code, for the dev banner. Always null in production. */
  devCode: string | null;
}

/** Sends a code to the account's email (MOCK: to the dev outbox). */
export function sendEmailCodeNow(user: StoredUser, now: Date): CodeSent {
  if (!user.email) throw new AuthError('invalid_email', i18n.t('auth:error.invalidEmail'), 400);
  const challenge = emailOtp.issue(user.email, now);
  const code = challenge.code ?? '';
  devSend({ kind: 'email_code', to: user.email, text: `Your Gwani email code is ${code}.`, value: code }, now);
  return { target: user.email, expiresAt: challenge.expiresAt.toISOString(), resendAvailableAt: challenge.resendAvailableAt.toISOString(), devCode: MOCK_AUTH ? code : null };
}

/** Saves a new (unverified) email on the account and sends it a code. */
export function startEmailVerification(user: StoredUser, rawEmail: string, now: Date): StoredUser {
  const email = rawEmail.trim().toLowerCase();
  if (!isEmail(email)) throw new AuthError('invalid_email', i18n.t('auth:error.invalidEmail'), 400);
  assertEmailFree(email, user.id);
  const saved = saveUser({ ...user, email, emailVerified: false });
  sendEmailCodeNow(saved, now);
  return saved;
}

export function finishEmailVerification(user: StoredUser, code: string, now: Date): StoredUser {
  if (!user.email) throw new AuthError('no_code', i18n.t('auth:error.noCode'), 400);
  emailOtp.check(user.email, code, now);
  return saveUser({ ...user, emailVerified: true });
}

/**
 * Sends a code to verify a phone: the account's own, or a new one (customers adding a number later).
 * A new number must not belong to another account; it's saved unverified until the code is entered.
 */
export function sendPhoneCodeNow(user: StoredUser, rawPhone: string, now: Date): {user: StoredUser;sent: CodeSent;} {
  const phone = normalizeOrThrow(rawPhone);
  simulateNetworkFailure(phone);
  assertPhoneFree(phone, user.id);
  const saved = phone === user.phone ? user : saveUser({ ...user, phone, phoneVerified: false });
  const challenge = loginOtp.issue(phone, now);
  const code = challenge.code ?? '';
  devSend({ kind: 'otp', to: phone, text: `Your Gwani code is ${code}. It expires in ${OTP.expiresMinutes} minutes.`, value: code }, now);
  return { user: saved, sent: { target: phone, expiresAt: challenge.expiresAt.toISOString(), resendAvailableAt: challenge.resendAvailableAt.toISOString(), devCode: MOCK_AUTH ? code : null } };
}

export function finishPhoneVerification(user: StoredUser, code: string, now: Date): StoredUser {
  if (!user.phone) throw new AuthError('no_code', i18n.t('auth:error.noCode'), 400);
  loginOtp.check(user.phone, code, now);
  return saveUser({ ...user, phoneVerified: true });
}

/** Test helper: forget the in-memory state (codes, locks, sessions). */
export function resetAuthBackendForTests() {
  users = null;
  loginOtp.clear();
  signupTokens.clear();
  failures.clear();
  emailOtp.clear();
  outbox = [];
}
