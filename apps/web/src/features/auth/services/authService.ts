import { apiRequest, establishApiSession, getApiAccessToken, type ApiSession } from '../../../services/apiClient';
import { ApiError, requestAccessToken } from '../../../services/mockApi';
import { getAuthSnapshot, updateSessionUser } from '../session';
import { ROLE } from '../constants';
import { findUser, saveUser, toUser } from './authBackend';
import { adoptLiveSession, requestSession as importRequestSession, signOutHere } from './sessionService';
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
  VerifyOtpResult
} from '../types';

type LiveSession = ApiSession & { user: User };

async function acceptSession(session: LiveSession): Promise<User> {
  const tokens = establishApiSession(session);
  adoptLiveSession(session.user, tokens);
  return session.user;
}

export function requestOtp(phone: string): Promise<OtpRequestResult> {
  return apiRequest('/v1/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) }, false);
}

export async function verifyOtp(phone: string, code: string, { remember = true }: {remember?: boolean;} = {}): Promise<VerifyOtpResult> {
  const result = await apiRequest<VerifyOtpResult & Partial<LiveSession>>('/v1/auth/otp/verify', {
    method: 'POST', body: JSON.stringify({ phone, code, remember }),
  }, false);
  if (result.status === 'signed_in') await acceptSession(result as LiveSession);
  return result;
}

export async function registerUser(data: RegisterInput): Promise<User> {
  const session = await apiRequest<LiveSession>('/v1/auth/signup/phone', {
    method: 'POST', body: JSON.stringify(data),
  }, false);
  return acceptSession(session);
}

export async function registerCustomer(input: CustomerSignupInput, { remember = true }: {remember?: boolean;} = {}): Promise<User> {
  const session = await apiRequest<LiveSession>('/v1/auth/signup', {
    method: 'POST', body: JSON.stringify({ ...input, role: 'customer', remember }),
  }, false);
  return acceptSession(session);
}

export async function registerProvider(input: ProviderSignupInput, { remember = true }: {remember?: boolean;} = {}): Promise<User> {
  const session = await apiRequest<LiveSession>('/v1/auth/signup', {
    method: 'POST', body: JSON.stringify({ ...input, role: 'provider', remember }),
  }, false);
  return acceptSession(session);
}

export async function loginWithPassword(identifier: string, password: string, { remember = false }: {remember?: boolean;} = {}): Promise<User> {
  const session = await apiRequest<LiveSession>('/v1/auth/login', {
    method: 'POST', body: JSON.stringify({ identifier, password, remember }),
  }, false);
  return acceptSession(session);
}

export async function requestPasswordResetOtp(identifier: string): Promise<PasswordResetOtpResult> {
  return apiRequest('/v1/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ identifier }) }, false);
}

export function verifyPasswordResetOtp(identifier: string, code: string): Promise<PasswordResetVerifyResult> {
  return apiRequest('/v1/auth/password-reset/verify', { method: 'POST', body: JSON.stringify({ identifier, code }) }, false);
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<PasswordResetOutcome> {
  await apiRequest('/v1/auth/password-reset/complete', {
    method: 'POST', body: JSON.stringify({ resetToken, newPassword }),
  }, false);
  return { status: 'go_to_login' };
}

export function logout(): Promise<void> {
  return signOutHere();
}

export function sessionRecord(): StoredUser {
  const requestToken = requestAccessToken();
  if (requestToken && requestToken === getApiAccessToken()) {
    const user = getAuthSnapshot().user;
    if (!user?.roles.includes(ROLE.Provider)) throw new ApiError('This account is not a vendor', 403);
    const stored = findUser(user.id);
    const saved = stored?.roles.includes(ROLE.Provider) ? stored : null;
    return saveUser({
      ...user,
      vendorId: saved?.vendorId ?? user.vendorId,
      providerSignup: saved?.providerSignup ?? user.providerSignup,
      passwordHash: saved?.passwordHash ?? null,
      vendorDraft: saved?.vendorDraft ?? null
    });
  }
  return importRequestSession().user;
}

export function commitUser(user: StoredUser): User {
  const safe = toUser(saveUser(user));
  updateSessionUser(safe);
  return safe;
}

