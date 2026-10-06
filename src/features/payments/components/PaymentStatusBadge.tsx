import { StatusBadge } from '../../../components/ui/StatusBadge';
import { PAYMENT_STATUS_META } from '../constants';
import type { PaymentStatus } from '../types';

/** Payment status pill, same look as the job and order badges. */
export function PaymentStatusBadge({ status, className = '' }: {status: PaymentStatus;className?: string;}) {
  return <StatusBadge meta={PAYMENT_STATUS_META[status]} className={className} />;
}
