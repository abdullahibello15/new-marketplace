import { REMOVED_PHOTO_PLACEHOLDER } from '../../data/moderationTakedowns';
import type { BadgeTone } from '../../components/ui/Badge';
import type { AuditAction, DisputeCaseStatus, DocumentType, ModerationKind, ModerationSource, ModerationTab, VerificationStatus } from './types';

/* ---------- Verification ---------- */

export const VERIFICATION_STATUS = {
  Pending: 'pending',
  InReview: 'in_review',
  Approved: 'approved',
  Rejected: 'rejected',
  MoreInfo: 'more_info'
} as const;

export const VERIFICATION_STATUS_META: Record<VerificationStatus, {label: string;tone: BadgeTone;}> = {
  pending: { label: 'Pending', tone: 'info' },
  in_review: { label: 'In review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  more_info: { label: 'More info needed', tone: 'neutral' }
};

export const DOCUMENT_TYPE = {
  NationalId: 'national_id',
  DriversLicence: 'drivers_licence',
  VotersCard: 'voters_card',
  BusinessRegistration: 'business_registration',
  ProofOfAddress: 'proof_of_address',
  TradeCertificate: 'trade_certificate'
} as const;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  national_id: 'National ID (NIN slip)',
  drivers_licence: 'Driver’s licence',
  voters_card: 'Voter’s card',
  business_registration: 'Business registration (CAC)',
  proof_of_address: 'Proof of address',
  trade_certificate: 'Trade certificate'
};

/** MOCK specimen artwork for each document type (public/admin-docs). */
export const DOCUMENT_PLACEHOLDERS: Record<DocumentType, string> = {
  national_id: '/admin-docs/national-id.svg',
  drivers_licence: '/admin-docs/drivers-licence.svg',
  voters_card: '/admin-docs/voters-card.svg',
  business_registration: '/admin-docs/business-registration.svg',
  proof_of_address: '/admin-docs/proof-of-address.svg',
  trade_certificate: '/admin-docs/trade-certificate.svg'
};

/* ---------- Disputes ---------- */

export const DISPUTE_CASE_STATUS = {
  Open: 'open',
  InMediation: 'in_mediation',
  Resolved: 'resolved'
} as const;

export const DISPUTE_CASE_STATUS_META: Record<DisputeCaseStatus, {label: string;tone: BadgeTone;}> = {
  open: { label: 'Open', tone: 'danger' },
  in_mediation: { label: 'In mediation', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' }
};

/* ---------- Moderation ---------- */

export const MODERATION_KIND = {
  ProfilePhoto: 'profile_photo',
  Review: 'review',
  Product: 'product',
  PortfolioPhoto: 'portfolio_photo'
} as const;

export const MODERATION_KIND_LABELS: Record<ModerationKind, string> = {
  profile_photo: 'Profile photo',
  review: 'Review',
  product: 'Product',
  portfolio_photo: 'Portfolio photo'
};

export const MODERATION_SOURCE = {
  NewUpload: 'new_upload',
  UserReport: 'user_report',
  KeywordFlag: 'keyword_flag',
  DuplicateImage: 'duplicate_image'
} as const;

export const MODERATION_SOURCE_LABELS: Record<ModerationSource, string> = {
  new_upload: 'New upload',
  user_report: 'Reported by a user',
  keyword_flag: 'Automated flag: keywords',
  duplicate_image: 'Automated flag: duplicate image'
};

export const MODERATION_STATUS = {
  Pending: 'pending',
  Approved: 'approved',
  Removed: 'removed'
} as const;

export const MODERATION_TAB = {
  Photos: 'photos',
  Reviews: 'reviews',
  Catalogue: 'catalogue',
  Reported: 'reported',
  Appeals: 'appeals'
} as const;

export const MODERATION_TAB_LABELS: Record<ModerationTab, string> = {
  photos: 'Profile photos',
  reviews: 'Reviews',
  catalogue: 'Catalogue items',
  reported: 'Reported content',
  appeals: 'Appeals'
};

/** Placeholder shown where a removed profile photo was. */
export const REMOVED_PHOTO_URL = REMOVED_PHOTO_PLACEHOLDER;

/* ---------- Audit ---------- */

export const AUDIT_ACTION = {
  VerificationClaim: 'verification.claim',
  VerificationRelease: 'verification.release',
  VerificationApprove: 'verification.approve',
  VerificationReject: 'verification.reject',
  VerificationRequestInfo: 'verification.request_info',
  VerificationRevealId: 'verification.reveal_id',
  DisputeClaim: 'dispute.claim',
  DisputeMessage: 'dispute.message',
  DisputeRequestEvidence: 'dispute.request_evidence',
  DisputeNote: 'dispute.note',
  DisputeResolve: 'dispute.resolve',
  ModerationApprove: 'moderation.approve',
  ModerationRemove: 'moderation.remove',
  ModerationWarn: 'moderation.warn',
  ModerationSuspend: 'moderation.suspend',
  ModerationAppealUpheld: 'moderation.appeal_upheld',
  ModerationAppealOverturned: 'moderation.appeal_overturned',
  VendorSlaReminder: 'vendor.sla_reminder',
  VendorSlaFlag: 'vendor.sla_flag',
  VendorReengage: 'vendor.reengage',
  VendorOutreachFlag: 'vendor.outreach_flag',
  BulkPartnerCreate: 'bulk.partner_create',
  BulkVendorImport: 'bulk.vendor_import',
  BulkImportUndo: 'bulk.import_undo',
  BulkInviteResend: 'bulk.invite_resend'
} as const;

/** Follow-ups with at-risk vendors (response times and churn), shown next to the vendor on those lists. */
export const OUTREACH_ACTIONS: readonly AuditAction[] = [AUDIT_ACTION.VendorSlaReminder, AUDIT_ACTION.VendorSlaFlag, AUDIT_ACTION.VendorReengage, AUDIT_ACTION.VendorOutreachFlag];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  'verification.claim': 'Claimed for review',
  'verification.release': 'Released claim',
  'verification.approve': 'Approved verification',
  'verification.reject': 'Rejected verification',
  'verification.request_info': 'Requested more information',
  'verification.reveal_id': 'Viewed full ID number',
  'dispute.claim': 'Took on dispute',
  'dispute.message': 'Messaged parties',
  'dispute.request_evidence': 'Requested evidence',
  'dispute.note': 'Added internal note',
  'dispute.resolve': 'Resolved dispute',
  'moderation.approve': 'Approved content',
  'moderation.remove': 'Removed content',
  'moderation.warn': 'Warned vendor',
  'moderation.suspend': 'Suspended vendor',
  'moderation.appeal_upheld': 'Upheld removal on appeal',
  'moderation.appeal_overturned': 'Reinstated content on appeal',
  'vendor.sla_reminder': 'Sent response-time reminder',
  'vendor.sla_flag': 'Flagged for response-time review',
  'vendor.reengage': 'Sent re-engagement message',
  'vendor.outreach_flag': 'Flagged for outreach',
  'bulk.partner_create': 'Created partner association',
  'bulk.vendor_import': 'Imported vendors',
  'bulk.import_undo': 'Undid vendor import',
  'bulk.invite_resend': 'Resent profile invitation'
};

/* ---------- Routes ---------- */

export const ADMIN_ROUTES = {
  home: '/admin',
  verification: '/admin/verification',
  application: (id: string) => `/admin/verification/${encodeURIComponent(id)}`,
  disputes: '/admin/disputes',
  dispute: (id: string) => `/admin/disputes/${encodeURIComponent(id)}`,
  moderation: '/admin/moderation',
  analytics: '/admin/analytics',
  outreach: '/admin/outreach',
  bulk: '/admin/bulk',
  vendorImport: '/admin/bulk/vendor-import',
  vendorImportDetail: (id: string) => `/admin/bulk/imports/${encodeURIComponent(id)}`,
  audit: '/admin/audit'
} as const;

/** Where vendors see verification outcomes, warnings and removed content, and resubmit or appeal. */
export const VENDOR_STANDING_ROUTE = '/pro/verification';
