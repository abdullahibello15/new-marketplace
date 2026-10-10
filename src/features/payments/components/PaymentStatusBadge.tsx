import { useTranslation } from 'react-i18next';
import { paymentStatusLabel } from '../../../i18n/labels';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { PAYMENT_STATUS_META } from '../constants';
import type { PaymentStatus } from '../types';

/** Payment status pill, same look as the job and order badges. */
export function PaymentStatusBadge({ status, className = '' }: {status: PaymentStatus;className?: string;}) {
  useTranslation();
  const meta = PAYMENT_STATUS_META[status];
  return <StatusBadge meta={{ ...meta, label: paymentStatusLabel(status, meta.label) }} className={className} />;
}
