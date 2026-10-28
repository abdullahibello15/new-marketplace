// Moved to packages/domain (@zamani/domain); this path keeps working. The badge styling (UI) stays here.
import type { EscrowStatus, PaymentStatus, TransactionStatus } from './types';
export * from '@zamani/domain/features/payments/constants';

export const PAYMENT_STATUS_META: Record<PaymentStatus, {label: string;badgeClass: string;dotClass: string;}> = {
  pending: { label: 'Awaiting payment', badgeClass: 'bg-[#F7EBCB] text-mustard-dark', dotClass: 'bg-mustard-dark' },
  processing: { label: 'Processing', badgeClass: 'bg-[#E4EAF3] text-[#2B4A7A]', dotClass: 'bg-[#2B4A7A]' },
  paid: { label: 'Paid', badgeClass: 'bg-pine text-white', dotClass: 'bg-white' },
  failed: { label: 'Failed', badgeClass: 'bg-clay-soft text-clay-dark', dotClass: 'bg-clay-dark' },
  expired: { label: 'Expired', badgeClass: 'bg-sand text-muted', dotClass: 'bg-muted' },
  refunded: { label: 'Refunded', badgeClass: 'bg-[#EDE6F5] text-[#5B3E8A]', dotClass: 'bg-[#5B3E8A]' }
};

export const ESCROW_STATUS_META: Record<EscrowStatus, {label: string;badgeClass: string;dotClass: string;}> = {
  held: { label: 'Held in escrow', badgeClass: 'bg-[#E4EAF3] text-[#2B4A7A]', dotClass: 'bg-[#2B4A7A]' },
  released: { label: 'Released', badgeClass: 'bg-pine text-white', dotClass: 'bg-white' },
  refunded: { label: 'Refunded', badgeClass: 'bg-[#EDE6F5] text-[#5B3E8A]', dotClass: 'bg-[#5B3E8A]' },
  disputed: { label: 'Disputed: on hold', badgeClass: 'bg-[#8F3916] text-white', dotClass: 'bg-white' },
  partially_refunded: { label: 'Partially refunded', badgeClass: 'bg-[#F7EBCB] text-mustard-dark', dotClass: 'bg-mustard-dark' }
};

/** Same pills as the payment and escrow badges, so a status looks the same everywhere. */
export const TRANSACTION_STATUS_META: Record<TransactionStatus, {label: string;badgeClass: string;dotClass: string;}> = {
  paid: { ...PAYMENT_STATUS_META.paid, label: 'Paid' },
  held: { ...ESCROW_STATUS_META.held, label: 'Held in escrow' },
  pending: { ...PAYMENT_STATUS_META.pending, label: 'Pending' },
  failed: { ...PAYMENT_STATUS_META.failed, label: 'Failed' },
  refunded: { ...PAYMENT_STATUS_META.refunded, label: 'Refunded' }
};
