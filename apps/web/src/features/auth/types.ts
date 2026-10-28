import type { NigerLga, TradeCategory } from '../../types/marketplace';
import type { AdminRole } from '../admin/config/roles';
import type { LanguageId, Role, RiderVehicle, SignupRole } from './constants';

export interface RiderProfile {
  lga: NigerLga;
  town: string;
  vehicle: RiderVehicle;
  plateNumber: string | null;
}

/** A signed-in person. One account can hold several roles; `activeRole` picks the shell they're in. */
export interface User {
  id: string;
  roles: Role[];
  activeRole: Role;
  /**
   * E.164, e.g. +2348000000001, or '' when none is set: customers sign up with an email and add a phone
   * later (for SMS reminders and cash or delivery orders). Providers, riders and staff always have one.
   */
  phone: string;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  name: string;
  language: LanguageId;
  createdAt: string;
  /** Customers and providers sign in with a password (email or phone); riders and staff use phone codes. */
  hasPassword: boolean;
  /** Staff only: which admin sections and actions they get. */
  adminRole: AdminRole | null;
  /** Staff only: set while a Super admin has suspended them. A suspended account can't sign in. */
  adminSuspendedAt: string | null;
  /** Staff only: who added them (null for accounts that existed from the start). */
  adminAddedBy: {id: string;name: string;} | null;
  /** When they last signed in, or null if never. */
  lastLoginAt: string | null;
  /** Providers: their vendor profile (null until they finish vendor setup after signup). */
  vendorId: string | null;
  /** Providers between signup and vendor setup: the base location and terms they gave at signup. */
  providerSignup: ProviderSignupInfo | null;
  /** Riders: their setup. */
  rider: RiderProfile | null;
  /** Customers: saved delivery/visit address and the area shown under their name. */
  address: string | null;
  area: string | null;
}

export interface ProviderSignupInfo {
  lga: NigerLga;
  /** Town or a landmark, e.g. "Tunga, behind NEPA office". */
  town: string;
  termsAcceptedAt: string;
}

/** POST /auth/signup/customer — email and password; no phone at signup. */
export interface CustomerSignupInput {
  name: string;
  email: string;
  password: string;
  language?: LanguageId;
}

/** POST /auth/signup/provider — the vendor setup (business, trade) comes after verification. */
export interface ProviderSignupInput {
  name: string;
  phone: string;
  email: string;
  lga: NigerLga;
  town: string;
  password: string;
  acceptedTerms: boolean;
  language?: LanguageId;
}

/** Vendor setup after provider signup: the rest of the draft vendor profile (location came at signup). */
export type VendorBusinessInput = Pick<VendorSetupInput, 'kind' | 'businessName' | 'tradeCategory'>;

/** The provider setup: what the draft vendor profile is created from. */
export interface VendorSetupInput {
  kind: 'service' | 'retail';
  businessName: string;
  tradeCategory: TradeCategory;
  lga: NigerLga;
  town: string;
  acceptedTerms: boolean;
}

export type RiderSetupInput = RiderProfile;

/** Claiming a profile a trade association created (bulk import), after verifying the invited phone. */
export interface ClaimSetupInput {
  token: string;
  businessName: string;
  town: string;
  bio: string;
  yearsExperience: number | null;
  acceptedTerms: boolean;
}

/** Phone-first signup: riders, and providers claiming a profile their association created. */
export interface RegisterInput {
  /** From verifyOtp: proves the phone was verified just now. */
  signupToken: string;
  name: string;
  email?: string | null;
  role: SignupRole;
  language?: LanguageId;
  /** Required for riders. */
  rider?: RiderSetupInput;
  /** Keep this device signed in (default yes: they just verified their phone here). */
  remember?: boolean;
  /** Providers claiming an invited profile instead of setting up a new one. */
  claim?: ClaimSetupInput;
}

export interface OtpRequestResult {
  phone: string;
  expiresAt: string;
  resendAvailableAt: string;
  /** Mock mode only (dev server): the code, for the dev banner. Always null in production. */
  devCode: string | null;
}

export type VerifyOtpResult =
{status: 'signed_in';user: User;} |
/** A number we don't know yet: continue to signup with this token. */
{status: 'new_user';phone: string;signupToken: string;expiresAt: string;};

export type AuthErrorCode =
'invalid_phone' |
'resend_too_soon' |
'no_code' |
'wrong_code' |
'expired' |
'locked' |
'signup_expired' |
'invalid_credentials' |
'rate_limited' |
'weak_password' |
'invalid_email' |
'email_taken' |
'phone_taken' |
'contact_unverified' |
'resend_limit' |
'same_password' |
'reset_expired' |
'invalid_identifier' |
'duplicate_vendor' |
'invite_exists' |
'role_exists' |
'not_signed_in' |
'not_allowed' |
'invalid_input' |
'account_suspended';

/* ---------- Password reset by one-time code (rules: passwordResetConfig.ts) ---------- */

export type PasswordResetChannel = 'sms' | 'email';

/**
 * The answer to a reset-code request. Identical whether or not an account exists (and has a password),
 * so it can't be used to find out who is registered.
 */
export interface PasswordResetOtpResult {
  /** The phone (E.164) or email (lower case) the code was sent to, if an account exists. */
  identifier: string;
  channel: PasswordResetChannel;
  expiresAt: string;
  resendAvailableAt: string;
  /** Always null: in mock mode the test code shows in the dev banner, as for every account. */
  devCode: null;
}

export interface PasswordResetVerifyResult {
  /** Short-lived, one use, tied to the verified phone/email. */
  resetToken: string;
  expiresAt: string;
}

/** What happens after the new password is saved (PASSWORD_RESET.afterReset). */
export type PasswordResetOutcome = {status: 'go_to_login';} | {status: 'signed_in';user: User;};

/* ---------- Sessions (design: services/sessionService.ts; timing: sessionConfig.ts) ---------- */

/** Why a session ended. */
export type SessionEndReason =
/** The person signed out. */
'logout' |
/** Signed out from another device (active sessions page). */
'revoked' |
/** "Log out of all other devices", a password change or a reset. */
'revoked_all' |
/** A new sign-in on the same browser replaced it (session fixation protection). */
'replaced' |
/** The account passed the session limit; the oldest was signed out. */
'limit' |
/** An already-used refresh token came back: treated as theft. */
'reuse_detected' |
/** The account was suspended or removed. */
'account_suspended' |
'password_changed';

/** One signed-in device, as the active sessions page shows it (no tokens). */
export interface SessionInfo {
  id: string;
  /** Turned into "Chrome on Android" by utils/device. */
  userAgent: string;
  /** Approximate (MOCK: from the device, not a real IP lookup). */
  location: string;
  createdAt: string;
  lastActiveAt: string;
  remember: boolean;
  /** This device. */
  current: boolean;
}

/** Why this browser's session ended, for the login screen's message. */
export type ClientEndReason = 'logout' | 'expired' | 'idle' | 'elsewhere';
