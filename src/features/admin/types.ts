import type { Verification } from '../../types/marketplace';
import type { DisputeOutcome, DisputeReason, JobParty } from '../jobs/types';
import type { AdminRole } from './config/roles';
import type {
  AUDIT_ACTION,
  DISPUTE_CASE_STATUS,
  DOCUMENT_TYPE,
  MODERATION_KIND,
  MODERATION_SOURCE,
  MODERATION_STATUS,
  MODERATION_TAB,
  VERIFICATION_STATUS } from
'./constants';

type ValueOf<T> = T[keyof T];

/* ---------- Session and audit ---------- */

/** A Gwani staff member (MOCK directory; real accounts come from the backend). */
export interface AdminUser {
  id: string;
  name: string;
  role: AdminRole;
}


export type AuditAction = ValueOf<typeof AUDIT_ACTION>;
export type AuditTargetType = 'vendor_verification' | 'dispute' | 'moderation_item' | 'vendor' | 'vendor_import' | 'association';

/** One admin action. Never edited, only appended. */
export interface AuditEntry {
  id: string;
  at: string;
  actor: {id: string;name: string;role: AdminRole;};
  action: AuditAction;
  target: {type: AuditTargetType;id: string;label: string;};
  /** The written reason, where the action needs one. */
  reason: string | null;
  /** Extra context, e.g. "Tier: Trade-Verified" or "Refund ₦10,000". */
  details: string | null;
}

/** Someone working on an item, so two admins don't review it at once. */
export interface Claim {
  adminId: string;
  adminName: string;
  at: string;
  expiresAt: string;
}

/* ---------- Verification ---------- */

export type VerificationStatus = ValueOf<typeof VERIFICATION_STATUS>;
export type DocumentType = ValueOf<typeof DOCUMENT_TYPE>;

export interface VerificationDocument {
  id: string;
  type: DocumentType;
  /** Placeholder image (MOCK: specimen artwork, not a real document). */
  fileUrl: string;
  /** The name printed on the document, as read by the reviewer. */
  nameOnDocument: string;
  /** Sensitive: shown masked everywhere except a deliberate, logged reveal. Null for documents without one. */
  idNumber: string | null;
  /** "yyyy-MM-dd"; null when it doesn't expire. */
  expiresOn: string | null;
  uploadedAt: string;
}

/** One reviewer's checks on one document. Null = not checked yet. */
export interface DocumentChecks {
  legible: boolean | null;
  notExpired: boolean | null;
  nameMatches: boolean | null;
}

export interface VerificationDecision {
  outcome: 'approved' | 'rejected' | 'more_info';
  by: string;
  at: string;
  /** Rejection reason, or the message to the vendor for more information. */
  message: string | null;
  /** More information: the document types the vendor must upload. */
  documentsNeeded: DocumentType[];
}

export interface VerificationApplication {
  id: string;
  vendorId: string;
  vendorName: string;
  /** The person applying for the business, as given on the profile (what document names are checked against). */
  applicantName: string;
  /** The tier the vendor had when applying. */
  currentTier: Verification;
  requestedTier: Verification;
  submittedAt: string;
  status: VerificationStatus;
  documents: VerificationDocument[];
  /** Per document id. */
  checks: Record<string, DocumentChecks>;
  notes: string;
  claim: Claim | null;
  /** The latest decision (a more-info request is replaced by the next decision). */
  decision: VerificationDecision | null;
  /** Set when the vendor uploaded documents after a rejection or a more-info request. */
  resubmittedAt: string | null;
}

/* ---------- Disputes ---------- */

export type DisputeCaseStatus = ValueOf<typeof DISPUTE_CASE_STATUS>;
export type DisputeSubjectKind = 'job' | 'order';

/** Something a party sent the mediator: their claim, their side of the story, photos. Read-only. */
export interface DisputeEvidence {
  id: string;
  party: JobParty;
  kind: 'claim' | 'response' | 'photo';
  text: string;
  attachments: string[];
  at: string;
}

/** A message in the mediation thread (mediator ↔ parties). Never edited. */
export interface MediationMessage {
  id: string;
  from: 'mediator' | JobParty;
  /** For the mediator's messages: who it went to. */
  to: 'customer' | 'vendor' | 'both' | 'mediator';
  authorName: string;
  body: string;
  at: string;
  /** An evidence request sets a response deadline for that party. */
  kind: 'message' | 'evidence_request';
}

/** The in-app chat between customer and vendor before the dispute (a read-only copy). */
export interface PartyMessage {
  id: string;
  from: JobParty;
  body: string;
  at: string;
}

/** Visible to Gwani staff only. */
export interface InternalNote {
  id: string;
  authorName: string;
  body: string;
  at: string;
}

/** When a party must respond by, and whether they did. */
export interface ResponseDeadline {
  requestedAt: string;
  dueAt: string;
  respondedAt: string | null;
}

export interface DisputeCase {
  id: string;
  subject: {kind: DisputeSubjectKind;id: string;};
  assignee: Claim | null;
  deadlines: Record<JobParty, ResponseDeadline | null>;
  evidence: DisputeEvidence[];
  messages: MediationMessage[];
  partyMessages: PartyMessage[];
  notes: InternalNote[];
}

/** A dispute as the list and workspace see it: the case plus its job or order summary. */
export interface DisputeSummary {
  id: string;
  subject: DisputeCase['subject'];
  status: DisputeCaseStatus;
  title: string;
  customerName: string;
  vendorId: string;
  vendorName: string;
  reason: DisputeReason;
  openedAt: string;
  /** Whole Naira at stake (what was paid). */
  amount: number;
  assignee: Claim | null;
  deadlines: DisputeCase['deadlines'];
  /** A party's response is overdue. */
  overdue: boolean;
  outcome: DisputeOutcome | null;
}

/** A party's track record, for the mediator. */
export interface PartyHistory {
  name: string;
  /** Other disputes they're part of (open or closed). */
  pastDisputes: number;
  cancellations: number;
  /** Vendors only: rating and number of reviews. */
  rating: {average: number;count: number;} | null;
  jobs: number;
  orders: number;
}

/* ---------- Moderation ---------- */

export type ModerationKind = ValueOf<typeof MODERATION_KIND>;
export type ModerationSource = ValueOf<typeof MODERATION_SOURCE>;
export type ModerationStatus = ValueOf<typeof MODERATION_STATUS>;
export type ModerationTab = ValueOf<typeof MODERATION_TAB>;

export interface ModerationContent {
  /** Photos and products. */
  imageUrl: string | null;
  /** Reviews and product descriptions. */
  text: string | null;
  /** Product name, or the reviewer's name for reviews. */
  title: string | null;
  price: number | null;
  rating: number | null;
  /** What it points at: the review id, product id, or the photo URL (portfolio / profile). */
  targetId: string;
}

export interface ModerationAppeal {
  message: string;
  at: string;
  status: 'pending' | 'upheld' | 'overturned';
  decidedBy: string | null;
  decidedAt: string | null;
}

export interface ModerationItem {
  id: string;
  kind: ModerationKind;
  source: ModerationSource;
  status: ModerationStatus;
  vendorId: string;
  vendorName: string;
  /** Who posted it: the vendor, or the customer who wrote a review. */
  postedBy: {name: string;role: 'vendor' | 'customer';};
  content: ModerationContent;
  /** Why it's in the queue: the report, keyword or duplicate match. */
  flag: {reason: string;reportedBy: string | null;reportCount: number;keywords: string[];duplicateOf: {vendorName: string;imageUrl: string;} | null;};
  createdAt: string;
  decision: {action: 'approved' | 'removed';reason: string | null;by: string;at: string;} | null;
  appeal: ModerationAppeal | null;
  /** What was live before a removal, so an overturned appeal can put it back. */
  previous: unknown;
}

export interface PosterHistory {
  /** Vendors: how long they've been on Gwani, rating, removals, warnings, suspension. */
  removals: number;
  warnings: number;
  suspended: boolean;
  rating: number | null;
  /** Items from this poster currently in the queue. */
  inQueue: number;
}

/** An item as the moderation queue shows it: with the poster's record. */
export type ModerationQueueItem = ModerationItem & {poster: PosterHistory;};

/** A warning sent to a vendor (shown on their Verification & standing page). */
export interface VendorWarning {
  id: string;
  vendorId: string;
  reason: string;
  at: string;
  by: string;
}
