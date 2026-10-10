import type { PlanId } from '../../vendor-dashboard/types';
import type { DraftProfile, InviteStatus } from '../../profile-claim/types';
import type { ImportTierHandling, InviteMethod } from '../config/bulkImport';

export const VENDOR_IMPORT_COLUMNS = [
'full_name',
'business_name',
'phone',
'email',
'trade_category',
'lga',
'town_landmark',
'years_experience',
'bio',
'service_areas'] as
const;

export type VendorImportColumn = (typeof VENDOR_IMPORT_COLUMNS)[number];
export type RawVendorRow = Record<VendorImportColumn, string>;

export type VendorRowStatus = 'valid' | 'warning' | 'error';

/** A vendor (or an invited draft) the row's phone or email already belongs to. */
export interface ExistingMatch {
  vendorId: string;
  vendorName: string;
  by: 'phone' | 'email';
  /** 'invited': a draft from an earlier import, not claimed yet. */
  kind: 'vendor' | 'invited';
  /** Already a member of the chosen partner's bundle. */
  alreadyMember: boolean;
}

/** What to do with a row whose vendor already exists. */
export type ExistingChoice = 'skip' | 'link';

export interface RowSuggestion {
  column: VendorImportColumn;
  /** The value to put in the cell. */
  value: string;
  label: string;
}

export interface VendorRowCheck {
  status: VendorRowStatus;
  errors: {column: VendorImportColumn;message: string;}[];
  warnings: string[];
  suggestions: RowSuggestion[];
  /** The cleaned-up profile (phone in one format, matched trade and LGA); null while the row has errors. */
  profile: DraftProfile | null;
  existing: ExistingMatch | null;
}

export interface ImportPartner {
  id: string;
  name: string;
  adminName: string;
  phone: string | null;
  email: string | null;
  terms: string | null;
  memberCount: number;
}

export interface NewPartnerInput {
  name: string;
  adminName: string;
  phone: string;
  email: string;
  terms: string;
}

export interface VendorImportSettings {
  planId: PlanId;
  /** "yyyy-MM-dd": when their bundle membership starts. */
  startDate: string;
  tier: ImportTierHandling;
  invite: InviteMethod;
}

/** One row sent to the server: a new vendor to create, or an existing one to link. */
export type ImportRowRequest =
{line: number;action: 'create';profile: DraftProfile;} |
{line: number;action: 'link';vendorId: string;vendorName: string;contact: string;profile: Pick<DraftProfile, 'fullName' | 'businessName' | 'phone' | 'email'>;} |
{line: number;action: 'skip';reason: string;profile: Pick<DraftProfile, 'fullName' | 'businessName' | 'phone' | 'email'>;};

export type ImportRowOutcome = 'created' | 'linked' | 'skipped' | 'failed';

/** What the history keeps for each row: only what's needed to show and follow up the import. */
export interface VendorImportRowRecord {
  line: number;
  fullName: string;
  businessName: string;
  phone: string;
  email: string | null;
  outcome: ImportRowOutcome;
  /** Why it was skipped or failed. */
  reason: string | null;
  vendorId: string | null;
  inviteId: string | null;
}

export type VendorImportStatus = 'running' | 'completed' | 'completed_with_errors' | 'undone' | 'partly_undone';

export interface VendorImportRecord {
  id: string;
  createdAt: string;
  finishedAt: string | null;
  partner: {id: string;name: string;};
  by: {id: string;name: string;};
  /** The uploaded file's name only; the file itself is never kept. */
  fileName: string;
  settings: VendorImportSettings;
  status: VendorImportStatus;
  counts: Record<ImportRowOutcome, number>;
  rows: VendorImportRowRecord[];
  undo: {at: string;by: string;reason: string;removed: number;} | null;
}

/** A history row joined with its invite's claim status, for the import detail page. */
export interface VendorImportDetailRow extends VendorImportRowRecord {
  invite: {status: InviteStatus;link: string;lastSentAt: string | null;sends: number;claimedAt: string | null;} | null;
}

export interface VendorImportDetail {
  record: VendorImportRecord;
  rows: VendorImportDetailRow[];
  claimed: number;
  unclaimed: number;
}

export interface ImportLookup {
  /** Existing vendors and invited drafts by E.164 phone and lower-case email. */
  phones: Record<string, Omit<ExistingMatch, 'by'>>;
  emails: Record<string, Omit<ExistingMatch, 'by'>>;
}

