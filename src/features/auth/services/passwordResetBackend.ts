import i18n from '../../../i18n';
import { addMinutes, differenceInSeconds } from 'date-fns';
import { DEFAULT_LANGUAGE, isAppLanguage } from '../../../i18n/config';
import { normalizeNigerianPhone, phoneError } from '../../../utils/phone';
import { JOB_ACTOR } from '../../jobs/constants';
import { recordAccountMessage } from '../../jobs/services/notificationService';
import { ROLE } from '../constants';
import { AuthError } from '../errors';
import { renderAuthMessage, SUPPORT_CONTACT } from '../messageTemplates';
import { PASSWORD_RESET } from '../passwordResetConfig';
import {
  clearPasswordLoginFailures,
  createOtpStore,
  devSend,
  endSessionsFor,
  findUserByEmail,
  findUserByPhone,
  isEmail,
  isSuspended,
  minutesText,
  mockHash,
  passwordProblem,
  randomToken,
  saveUser,
  simulateNetworkFailure } from
'./authBackend';
import type { StoredUser } from '../mock/users';
import type { PasswordResetChannel, PasswordResetOtpResult, PasswordResetVerifyResult } from '../types';

/*
 * MOCK backend for password reset by one-time code (rules: passwordResetConfig.ts). Sync and takes `now`,
 * like authBackend.ts; authService.ts wraps it in Promises. Codes, tokens and rate limits live in memory.
 * ⚠️ The rate limits are mocked here; real ones belong on the server, where the client can't skip them.
 */

const resetOtp = createOtpStore({
  ...PASSWORD_RESET.otp,
  lockedKey: 'auth:error.resetLocked',
  lockedNowKey: 'auth:error.resetLockedNow'
});
const resetTokens = new Map<string, {key: string;channel: PasswordResetChannel;userId: string;expiresAt: Date;}>();
const deviceRequests = new Map<string, Date[]>();

/** "0803…" or "+234…" → the E.164 phone (SMS); anything with an @ → the lower-case email. */
function parseIdentifier(raw: string): {key: string;channel: PasswordResetChannel;} {
  const value = raw.trim();
  if (value.includes('@')) {
    if (!isEmail(value)) throw new AuthError('invalid_identifier', i18n.t('auth:error.invalidEmail'), 400);
    return { key: value.toLowerCase(), channel: 'email' };
  }
  const phone = normalizeNigerianPhone(value);
  if (!phone) throw new AuthError('invalid_identifier', phoneError(value) ?? i18n.t('common:phone.invalid'), 400);
  return { key: phone, channel: 'sms' };
}

/** The account a reset can apply to: it exists, can sign in, and has a password (by email: a verified one). */
function resettableUser(key: string, channel: PasswordResetChannel): StoredUser | null {
  const user = channel === 'email' ? findUserByEmail(key) : findUserByPhone(key);
  if (!user || isSuspended(user) || !user.passwordHash) return null;
  if (channel === 'email' && !user.emailVerified) return null;
  return user;
}

const languageOf = (user: StoredUser) => isAppLanguage(user.language) ? user.language : DEFAULT_LANGUAGE;

/** MOCK per-device limit (any phone/email). Real limits are per IP/device on the server. */
function assertDeviceAllowed(deviceId: string, now: Date): Date[] {
  const { maxRequests, windowMinutes } = PASSWORD_RESET.deviceLimit;
  const recent = (deviceRequests.get(deviceId) ?? []).filter((at) => addMinutes(at, windowMinutes) > now);
  if (recent.length >= maxRequests) {
    const seconds = differenceInSeconds(addMinutes(recent[0], windowMinutes), now);
    throw new AuthError('rate_limited', i18n.t('auth:error.deviceLimited', { time: minutesText(seconds) }), 429, { retryAfterSeconds: seconds });
  }
  return recent;
}

/**
 * POST /auth/password/otp { identifier } — sends a reset code by SMS (phone) or email. The answer is the
 * same whether or not a resettable account exists: unknown ones get a decoy challenge and nothing is sent.
 */
export function requestResetOtpNow(raw: string, deviceId: string, now: Date): PasswordResetOtpResult {
  const { key, channel } = parseIdentifier(raw);
  if (channel === 'sms') simulateNetworkFailure(key);
  const recent = assertDeviceAllowed(deviceId, now);
  const user = resettableUser(key, channel);
  const challenge = resetOtp.issue(key, now, { decoy: !user });
  deviceRequests.set(deviceId, [...recent, now]);

  if (user && challenge.code) {
    const message = renderAuthMessage(languageOf(user), 'reset_code', { code: challenge.code, minutes: PASSWORD_RESET.otp.expiresMinutes });
    const text = channel === 'sms' ? message.sms : `${message.email.subject}: ${message.email.body}`;
    devSend({ kind: 'reset_code', to: key, text, value: challenge.code }, now);
  }
  return { identifier: key, channel, expiresAt: challenge.expiresAt.toISOString(), resendAvailableAt: challenge.resendAvailableAt.toISOString(), devCode: null };
}

/** POST /auth/password/otp/verify { identifier, code } — a right code gives a short-lived, one-use reset token. */
export function verifyResetOtpNow(raw: string, code: string, now: Date): PasswordResetVerifyResult {
  const { key, channel } = parseIdentifier(raw);
  resetOtp.check(key, code, now);
  const user = resettableUser(key, channel);
  // Only possible if the account changed in the meantime: answer like an expired code.
  if (!user) throw new AuthError('expired', i18n.t('auth:error.expired'), 410);
  const resetToken = randomToken();
  const expiresAt = addMinutes(now, PASSWORD_RESET.token.expiresMinutes);
  resetTokens.set(resetToken, { key, channel, userId: user.id, expiresAt });
  return { resetToken, expiresAt: expiresAt.toISOString() };
}

const expiredToken = () => new AuthError('reset_expired', i18n.t('auth:error.resetExpired'), 410);

/**
 * POST /auth/password/reset { resetToken, password } — sets the new password for the account the token
 * was verified for, signs out every session of that account, and tells the owner (in-app, SMS, email).
 * A weak or unchanged password leaves the token usable, so they can try another.
 */
export function resetPasswordNow(resetToken: string, password: string, now: Date): StoredUser {
  const t = resetTokens.get(resetToken);
  if (!t || t.expiresAt <= now) {
    resetTokens.delete(resetToken);
    throw expiredToken();
  }
  const problem = passwordProblem(password);
  if (problem) throw new AuthError('weak_password', problem, 400);
  const user = resettableUser(t.key, t.channel);
  if (!user || user.id !== t.userId) {
    resetTokens.delete(resetToken);
    throw expiredToken();
  }
  if (user.passwordHash === mockHash(password)) throw new AuthError('same_password', i18n.t('auth:error.samePassword'), 400);

  resetTokens.delete(resetToken);
  const saved = saveUser({ ...user, passwordHash: mockHash(password), hasPassword: true });
  endSessionsFor(saved.id, 'password_changed');
  clearPasswordLoginFailures(saved);
  notifyPasswordChanged(saved, now);
  return saved;
}

/** "Your password was changed. If this wasn't you, contact support": in-app, plus SMS and email (MOCK: dev outbox). */
function notifyPasswordChanged(user: StoredUser, now: Date) {
  const at = now.toISOString();
  const values = () => ({ support: SUPPORT_CONTACT });
  if (user.roles.includes(ROLE.Customer)) recordAccountMessage(JOB_ACTOR.Customer, user.id, 'common:message.passwordChanged', values, '/profile', at);
  if (user.roles.includes(ROLE.Provider) && user.vendorId) recordAccountMessage(JOB_ACTOR.Vendor, user.vendorId, 'common:message.passwordChanged', values, '/pro', at);

  const message = renderAuthMessage(languageOf(user), 'password_changed', { support: SUPPORT_CONTACT });
  if (user.phone && user.phoneVerified) devSend({ kind: 'security_notice', to: user.phone, text: message.sms, value: '' }, now);
  if (user.email && user.emailVerified) devSend({ kind: 'security_notice', to: user.email, text: `${message.email.subject}: ${message.email.body}`, value: '' }, now);
}

/** Test helper. */
export function resetPasswordResetForTests() {
  resetOtp.clear();
  resetTokens.clear();
  deviceRequests.clear();
}
