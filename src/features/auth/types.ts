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
  /** E.164, e.g. +2348035550142. Phone + one-time code is the main way to sign in. */
  phone: string;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  name: string;
  language: LanguageId;
  createdAt: string;
  /** Customers who added and verified an email can also sign in with it and a password. */
  hasPassword: boolean;
  /** Staff only: which admin sections and actions they get. */
  adminRole: AdminRole | null;
  /** Staff only: set while a Super admin has suspended them. A suspended account can't sign in. */
  adminSuspendedAt: string | null;
  /** Staff only: who added them (null for accounts that existed from the start). */
  adminAddedBy: {id: string;name: string;} | null;
  /** When they last signed in, or null if never. */
  lastLoginAt: string | null;
  /** Providers: their vendor profile. */
  vendorId: string | null;
  /** Riders: their setup. */
  rider: RiderProfile | null;
  /** Customers: saved delivery/visit address and the area shown under their name. */
  address: string | null;
  area: string | null;
}

/** The provider setup after signup: what the draft vendor profile is created from. */
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

export interface RegisterInput {
  /** From verifyOtp: proves the phone was verified just now. */
  signupToken: string;
  name: string;
  email?: string | null;
  role: SignupRole;
  language?: LanguageId;
  /** Required for providers (unless claiming). */
  vendor?: VendorSetupInput;
  /** Required for riders. */
  rider?: RiderSetupInput;
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
'invalid_token' |
'duplicate_vendor' |
'invite_exists' |
'role_exists' |
'not_signed_in' |
'not_allowed' |
'invalid_input' |
'account_suspended';
