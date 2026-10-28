import { useTranslation } from 'react-i18next';
import { escrowStatusLabel } from '../../../../i18n/labels';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { ESCROW_STATUS_META } from '../../constants';
import type { EscrowStatus } from '../../types';

/** Escrow status pill, same look as the payment, job and order badges. */
export function EscrowStatusBadge({ status, className = '' }: {status: EscrowStatus;className?: string;}) {
  useTranslation();
  const meta = ESCROW_STATUS_META[status];
  return <StatusBadge meta={{ ...meta, label: escrowStatusLabel(status, meta.label) }} className={className} />;
}
