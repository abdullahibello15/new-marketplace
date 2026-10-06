import { PAYMENT_STATUS } from '../constants';
import type { Payment } from '../types';

const TONE: Partial<Record<Payment['status'], string>> = {
  failed: 'border-clay/40 bg-clay-soft',
  expired: 'border-line bg-sand',
  refunded: 'border-[#5B3E8A]/30 bg-[#EDE6F5]'
};

/** The payment's outcome or review note in plain words (declined, short, extra, expired, refunded, disputed cash). */
export function PaymentOutcome({ payment }: {payment: Payment;}) {
  const text = payment.reviewFlag ?? payment.outcome;
  if (!text) return null;
  const tone = payment.reviewFlag ? 'border-mustard bg-[#FBF3DC]' : TONE[payment.status] ?? (payment.status === PAYMENT_STATUS.Paid ? 'border-pine/30 bg-[#E3EEEC]' : 'border-mustard bg-[#FBF3DC]');
  return (
    <p role="status" className={`rounded-xl border px-3 py-2.5 text-sm text-ink ${tone}`}>
      {text}
    </p>);

}
