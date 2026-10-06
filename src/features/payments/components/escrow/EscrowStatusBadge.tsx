import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { ESCROW_STATUS_META } from '../../constants';
import type { EscrowStatus } from '../../types';

/** Escrow status pill, same look as the payment, job and order badges. */
export function EscrowStatusBadge({ status, className = '' }: {status: EscrowStatus;className?: string;}) {
  return <StatusBadge meta={ESCROW_STATUS_META[status]} className={className} />;
}
