import { AUDIT_ACTION } from '../constants';
import { staffById } from './staff';
import type { AuditAction, AuditEntry, AuditTargetType } from '../types';

/*
 * MOCK audit history behind the decisions already in the other mocks (verification decisions, resolved
 * disputes, decided moderation items), so the audit log and each detail view start out consistent.
 */
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const DAY = 24;

let n = 0;
function entry(
hours: number,
staffId: string,
action: AuditAction,
target: {type: AuditTargetType;id: string;label: string;},
reason: string | null = null,
details: string | null = null)
: AuditEntry {
  const s = staffById(staffId);
  if (!s) throw new Error(`Unknown staff ${staffId}`);
  n += 1;
  return { id: `aud-seed-${n}`, at: hoursAgo(hours), actor: { id: s.id, name: s.name, role: s.role }, action, target, reason, details };
}

const ver = (id: string, label: string) => ({ type: 'vendor_verification' as const, id, label });
const dsp = (id: string, label: string) => ({ type: 'dispute' as const, id, label });
const mod = (id: string, label: string) => ({ type: 'moderation_item' as const, id, label });

export const mockAuditEntries: AuditEntry[] = [
entry(45 * DAY, 'adm-tunde', AUDIT_ACTION.VerificationApprove, ver('ver-0970', 'Yusuf Plumbing & Borehole'), null, 'Tier: Trade-Verified'),
entry(30 * DAY, 'adm-yakubu', AUDIT_ACTION.VerificationApprove, ver('ver-0985', 'Paiko Cool Electrical'), null, 'Tier: Trade-Verified'),
entry(20 * DAY, 'adm-tunde', AUDIT_ACTION.VerificationApprove, ver('ver-0990', 'Musa Auto Clinic'), null, 'Tier: Trade-Verified'),
entry(15 * DAY, 'adm-yakubu', AUDIT_ACTION.VerificationReject, ver('ver-0995', 'Emeka Paints & Finishes'), 'No evidence of trade skills for this tier'),
entry(12 * DAY, 'adm-tunde', AUDIT_ACTION.VerificationReject, ver('ver-0992', 'Swift Wheels Logistics'), 'A document has expired'),
entry(
  6 * DAY,
  'adm-yakubu',
  AUDIT_ACTION.VerificationRequestInfo,
  ver('ver-1012', 'Fatima Fresh Foods'),
  'For Trade-Verified we need a food handler’s certificate (NAFDAC or the state health office). Your business registration is fine.',
  'Needs: Trade certificate'
),
entry(6 * DAY, 'adm-tunde', AUDIT_ACTION.VerificationRequestInfo, ver('ver-1007', 'Grace Hair & Beauty'), 'Please upload a proof of address dated in the last 3 months.', 'Needs: Proof of address'),
entry(5 * DAY, 'adm-tunde', AUDIT_ACTION.VerificationRequestInfo, ver('ver-1013', 'Bosso Greens & Grains'), 'The proof of address photo is cut off at the bottom.', 'Needs: Proof of address'),
entry(2 * DAY, 'adm-tunde', AUDIT_ACTION.VerificationRequestInfo, ver('ver-1011', 'Bala Plumbing Services'), 'Annual re-verification: your trade certificate expired last month.', 'Needs: Trade certificate'),
entry(22 / 60, 'adm-yakubu', AUDIT_ACTION.VerificationClaim, ver('ver-1009', 'Chidi Woodworks')),
entry(10 / 60, 'adm-yakubu', AUDIT_ACTION.VerificationClaim, ver('ver-1008', 'Sadiya Stitches')),
entry(5 / 60, 'adm-tunde', AUDIT_ACTION.VerificationClaim, ver('ver-1010', 'Zainab Swift Dispatch')),
entry(
  220,
  'adm-amina',
  AUDIT_ACTION.DisputeResolve,
  dsp('dsp-job-2340', 'Job #2340 · Engine diagnosis'),
  'The quote covered a scan and a written report. The vendor sent the report on the day, so the work was done as agreed.',
  'Released to vendor'
),
entry(250, 'adm-amina', AUDIT_ACTION.DisputeResolve, dsp('dsp-job-2341', 'Job #2341 · Kaftan'), 'The embroidery wasn’t done. Refunding that part.', 'Partial refund ₦10,000'),
entry(280, 'adm-ngozi', AUDIT_ACTION.DisputeResolve, dsp('dsp-job-2342', 'Job #2342 · Simple Ankara style'), 'The vendor agreed the fabric was cut wrongly.', 'Full refund ₦12,000'),
entry(9 * DAY, 'adm-amina', AUDIT_ACTION.DisputeResolve, dsp('dsp-order-5024', 'Order #5024'), 'One of the two pieces didn’t match the photo.', 'Partial refund ₦6,000'),
entry(30, 'adm-amina', AUDIT_ACTION.DisputeClaim, dsp('dsp-job-2331', 'Job #2331 · Aso-ebi set')),
entry(26, 'adm-amina', AUDIT_ACTION.DisputeRequestEvidence, dsp('dsp-job-2331', 'Job #2331 · Aso-ebi set'), 'Please send photos of both outfits being worn, and the measurements note.', 'From: customer'),
entry(60, 'adm-amina', AUDIT_ACTION.DisputeClaim, dsp('dsp-job-2335', 'Job #2335 · Knotless braids')),
entry(3 * DAY, 'adm-ifeoma', AUDIT_ACTION.ModerationRemove, mod('mod-a1', 'Portfolio photo · Danladi Carpentry & Furniture'), 'Misleading, fake or not the vendor’s own work'),
entry(4 * DAY, 'adm-ifeoma', AUDIT_ACTION.ModerationRemove, mod('mod-a2', 'Profile photo · Abdullahi Mechanic Works'), 'Misleading, fake or not the vendor’s own work'),
entry(2 * DAY, 'adm-ngozi', AUDIT_ACTION.ModerationRemove, mod('mod-a3', 'Product · Kure Market Provisions'), 'Misleading, fake or not the vendor’s own work'),
entry(5 * DAY, 'adm-ifeoma', AUDIT_ACTION.ModerationRemove, mod('mod-a4', 'Portfolio photo · Chidi Woodworks'), 'Inappropriate or low-quality image'),
entry(8 * DAY, 'adm-ifeoma', AUDIT_ACTION.ModerationApprove, mod('mod-d1', 'Profile photo · Bida Royal Tailors')),
entry(7 * DAY, 'adm-ifeoma', AUDIT_ACTION.ModerationWarn, { type: 'vendor', id: 'abdullahi-mechanic', label: 'Abdullahi Mechanic Works' }, 'Using another vendor’s photos')];
