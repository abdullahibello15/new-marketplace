import { useTranslation } from 'react-i18next';
import { transactionStatusLabel } from '../../../../i18n/labels';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { TRANSACTION_STATUS_META } from '../../constants';
import type { TransactionStatus } from '../../types';

/** Paid / Held in escrow / Pending / Failed / Refunded, in the same pills as the payment and escrow badges. */
export function TransactionStatusBadge({ status, className = '' }: {status: TransactionStatus;className?: string;}) {
  useTranslation();
  const meta = TRANSACTION_STATUS_META[status];
  return <StatusBadge meta={{ ...meta, label: transactionStatusLabel(status, meta.label) }} className={className} />;
}
