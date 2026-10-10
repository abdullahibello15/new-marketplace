import i18n from '../../../i18n';
import { addDays, format } from 'date-fns';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { addVendor } from '../../../services/vendorStore';
import { JOB_ACTOR } from '../../jobs/constants';
import { recordAccountMessage } from '../../jobs/services/notificationService';
import { maskPhone } from '../../../utils/phone';
import { registerVendorContact } from '../../vendor-dashboard/services/associationService';
import { DASHBOARD_ROUTES } from '../../vendor-dashboard/constants';
import { buildDraftVendor } from '../../vendor-profile/utils/draftVendor';
import { CLAIM_ROUTE } from '../constants';
import type { Vendor } from '../../../types/marketplace';
import type { ClaimInput, ClaimView, DraftProfile, InviteChannel, InviteMessage, VendorInvite } from '../types';

/*
 * MOCK store of draft vendor profiles created by bulk imports, and the public "claim your profile" API.
 * A draft is NOT in the vendor directory, so it can't be found in search, booked or ordered from; it only
 * joins the directory (vendorStore) when the vendor claims it. Invitation SMS and emails are recorded
 * here, not really sent.
 */
let invites: VendorInvite[] = [];
let nextId = 1;

function newToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The claim link's path (the screen prefixes the site address). */
export const claimPath = (token: string) => CLAIM_ROUTE(token);

function messageText(invite: VendorInvite, channel: InviteChannel, origin: string): string {
  const link = `${origin}${claimPath(invite.token)}`;
  const until = format(new Date(invite.expiresAt), 'd MMM yyyy');
  if (channel === 'sms') {
    return `Gwani: ${invite.associationName} has added ${invite.profile.businessName} to Gwani. Claim your profile to start getting customers: ${link} (link works until ${until}).`;
  }
  return `Hello ${invite.profile.fullName},\n\n${invite.associationName} has created a Gwani profile for ${invite.profile.businessName}. Customers can't see it until you claim it.\n\nClaim your profile: ${link}\n\nYou'll set up your login, check your details and accept Gwani's terms. The link works until ${until}.`;
}

/** Records one invitation message (SMS to the phone, or email). Falls back to SMS when there's no email. */
function send(invite: VendorInvite, wanted: InviteChannel, by: string, origin: string, now: Date): InviteMessage {
  const channel: InviteChannel = wanted === 'email' && !invite.profile.email ? 'sms' : wanted;
  return { channel, to: channel === 'sms' ? maskPhone(invite.profile.phone) : invite.profile.email as string, text: messageText(invite, channel, origin), at: now.toISOString(), by };
}

const save = (updated: VendorInvite) => {
  invites = invites.map((i) => i.id === updated.id ? updated : i);
  return updated;
};

/* ---------- Used by the admin bulk import (sync, inside its own mock requests) ---------- */

export const invitesSnapshot = (): readonly VendorInvite[] => invites;
export const inviteById = (id: string) => invites.find((i) => i.id === id) ?? null;

export function createInviteNow(
input: {vendorId: string;profile: DraftProfile;importId: string;associationId: string;associationName: string;startsOn: string;channel: InviteChannel | null;by: string;origin: string;validDays: number;},
now: Date)
: VendorInvite {
  const invite: VendorInvite = {
    id: `inv-${nextId++}`,
    vendorId: input.vendorId,
    token: newToken(),
    status: 'invited',
    profile: input.profile,
    importId: input.importId,
    associationId: input.associationId,
    associationName: input.associationName,
    startsOn: input.startsOn,
    createdAt: now.toISOString(),
    expiresAt: addDays(now, input.validDays).toISOString(),
    messages: [],
    claimedAt: null,
    revokedAt: null
  };
  const withMessage = input.channel ? { ...invite, messages: [send(invite, input.channel, input.by, input.origin, now)] } : invite;
  invites = [...invites, withMessage];
  return withMessage;
}

/** Sends the link again (a fresh expiry date, same link). Only while it hasn't been claimed. */
export function resendInviteNow(id: string, channel: InviteChannel, by: string, origin: string, validDays: number, now: Date): InviteMessage {
  const invite = inviteById(id);
  if (!invite) throw new ApiError('We couldn’t find that invitation.', 404);
  if (invite.status !== 'invited') throw new ApiError(invite.status === 'claimed' ? 'They’ve already claimed their profile.' : 'This invitation was cancelled.', 409);
  const renewed = { ...invite, expiresAt: addDays(now, validDays).toISOString() };
  const message = send(renewed, channel, by, origin, now);
  save({ ...renewed, messages: [...renewed.messages, message] });
  return message;
}

/** Undo: the draft is withdrawn and the link stops working. Claimed profiles can't be undone this way. */
export function revokeInviteNow(id: string, now: Date): VendorInvite {
  const invite = inviteById(id);
  if (!invite || invite.status !== 'invited') throw new ApiError('Only invitations that haven’t been claimed can be withdrawn.', 409);
  return save({ ...invite, status: 'revoked', revokedAt: now.toISOString() });
}

/* ---------- The vendor's side: GET /claim/:token and POST /claim/:token ---------- */

function byToken(token: string): VendorInvite {
  const invite = invites.find((i) => i.token === token);
  if (!invite) throw new ApiError(i18n.t('auth:claim.error.invalid'), 404);
  return invite;
}

const isExpired = (invite: VendorInvite, now: Date) => invite.status === 'invited' && new Date(invite.expiresAt) < now;

/** GET /claim/:token — the draft profile to check. */
export function getClaim(token: string): Promise<ClaimView> {
  return mockResponse(() => {
    const invite = byToken(token);
    return { status: invite.status, profile: invite.profile, associationName: invite.associationName, expiresAt: invite.expiresAt, startsOn: invite.startsOn, expired: isExpired(invite, new Date()) };
  });
}

/** Sync read for the auth service: the invitation behind a claim link (it checks the phone matches). */
export function inviteForToken(token: string): VendorInvite {
  return byToken(token);
}

/**
 * The claim itself, called by the auth service once the invited phone number has been verified with a
 * one-time code (or to replay the mock history). The vendor confirms their details and accepts the
 * provider terms; their profile then joins the directory (visible in search, bookable) and they get a
 * welcome message.
 */
export function claimNow(token: string, input: ClaimInput, now: Date): {vendor: Vendor;invite: VendorInvite;} {
  const invite = byToken(token);
  if (invite.status === 'claimed') throw new ApiError(i18n.t('auth:claim.error.claimed'), 409);
  if (invite.status === 'revoked') throw new ApiError(i18n.t('auth:claim.error.revoked'), 410);
  if (isExpired(invite, now)) throw new ApiError(i18n.t('auth:claim.error.expired'), 410);
  if (!input.acceptedTerms) throw new ApiError(i18n.t('auth:claim.error.terms'), 400);
  if (input.profile.businessName.trim().length < 2) throw new ApiError(i18n.t('auth:claim.error.businessName'), 400);

  const p = invite.profile;
  const vendor = buildDraftVendor({
    id: invite.vendorId,
    businessName: input.profile.businessName.trim() || p.businessName,
    tradeCategory: p.tradeCategory,
    lga: p.lga,
    town: input.profile.town.trim() || p.town,
    bio: input.profile.bio,
    yearsExperience: input.profile.yearsExperience ?? p.yearsExperience,
    serviceAreas: p.serviceAreas
  });
  addVendor(vendor);
  registerVendorContact({ vendorId: vendor.id, vendorName: vendor.name, phone: p.phone, email: p.email });
  const claimed = save({
    ...invite,
    status: 'claimed',
    claimedAt: now.toISOString(),
    profile: { ...p, businessName: vendor.name, bio: vendor.about, town: input.profile.town.trim() || p.town, yearsExperience: input.profile.yearsExperience ?? p.yearsExperience }
  });
  recordAccountMessage(JOB_ACTOR.Vendor, vendor.id, 'common:message.welcomeClaimed', () => ({ association: invite.associationName }), DASHBOARD_ROUTES.requests);
  return { vendor, invite: claimed };
}
