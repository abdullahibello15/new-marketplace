// Moved to packages/domain (@zamani/domain); this path keeps working. The badge styling (UI) stays here.
import type { BadgeTone } from '../../components/ui/Badge';
import { LEDGER_ENTRY_TYPE_META as LEDGER_ENTRY_TYPE_META_TEXT } from '@zamani/domain/features/investor/constants';
import type { LedgerEntryType, PayoutRequestStatus } from './types';
export * from '@zamani/domain/features/investor/constants';

export const PAYOUT_REQUEST_STATUS_META: Record<PayoutRequestStatus, {label: string;tone: BadgeTone;}> = {
  pending: { label: 'Pending approval', tone: 'warning' },
  approved: { label: 'Approved · paid', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' }
};

/** Badge styling per value (UI only); the labels come from @zamani/domain. */
const LEDGER_ENTRY_TYPE_META_UI: Record<LedgerEntryType, {tone: BadgeTone;}> = {
  contribution: { tone: 'info' },
  dividend_accrued: { tone: 'success' },
  dividend_paid: { tone: 'neutral' },
  adjustment: { tone: 'warning' }
};

export const LEDGER_ENTRY_TYPE_META: Record<LedgerEntryType, {label: string;tone: BadgeTone;}> = Object.fromEntries(
  (Object.keys(LEDGER_ENTRY_TYPE_META_TEXT) as LedgerEntryType[]).map((s) => {
    const ui = LEDGER_ENTRY_TYPE_META_UI[s];
    return [s, { label: LEDGER_ENTRY_TYPE_META_TEXT[s].label, tone: ui.tone }];
  })
) as Record<LedgerEntryType, {label: string;tone: BadgeTone;}>;
