// Moved to packages/domain (@zamani/domain); this path keeps working. The badge styling (UI) stays here.
import type { BadgeTone } from '../../components/ui/Badge';
import type { AssociationMemberStatus, EarningStage, InvoiceStatus, SubscriptionStatus } from './types';
export * from '@zamani/domain/features/vendor-dashboard/constants';

export const EARNING_STAGE_META: Record<EarningStage, {label: string;tone: BadgeTone;}> = {
  pending: { label: 'Held in escrow', tone: 'info' },
  on_hold: { label: 'Disputed: on hold', tone: 'danger' },
  available: { label: 'Available', tone: 'warning' },
  paid_out: { label: 'Paid out', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'neutral' }
};

export const SUBSCRIPTION_STATUS_META: Record<SubscriptionStatus, {label: string;tone: BadgeTone;}> = {
  active: { label: 'Active', tone: 'success' },
  expiring_soon: { label: 'Expiring soon', tone: 'warning' },
  grace: { label: 'Grace period', tone: 'warning' },
  suspended: { label: 'Suspended', tone: 'danger' }
};

export const ASSOCIATION_MEMBER_STATUS_META: Record<AssociationMemberStatus, {label: string;tone: BadgeTone;}> = {
  pending_payment: { label: 'Awaiting payment', tone: 'warning' },
  active: { label: 'Covered', tone: 'success' },
  removed: { label: 'Removed', tone: 'neutral' }
};

export const INVOICE_STATUS_META: Record<InvoiceStatus, {label: string;tone: BadgeTone;}> = {
  open: { label: 'Awaiting payment', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  void: { label: 'Replaced', tone: 'neutral' }
};
