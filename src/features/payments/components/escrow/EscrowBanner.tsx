import { format } from 'date-fns';
import { ShieldCheckIcon } from 'lucide-react';
import { Price } from '../../../../components/ui/Price';
import { formatNaira } from '../../../../utils/format';
import { JOB_ACTOR } from '../../../jobs/constants';
import { ESCROW_EVENT, ESCROW_STATUS, PAYMENT_SUBJECT } from '../../constants';
import { ESCROW_CONFIG } from '../../escrow/escrowConfig';
import { escrowTotals } from '../../escrow/escrowRules';
import { EscrowStatusBadge } from './EscrowStatusBadge';
import type { JobParty } from '../../../jobs/types';
import type { Escrow } from '../../types';

const lastAt = (escrow: Escrow, type: Escrow['ledger'][number]['type']) => {
  const at = [...escrow.ledger].reverse().find((e) => e.type === type)?.at;
  return at ? format(new Date(at), 'd MMM') : '';
};

/** Where the customer's money is right now, in plain words, for whoever is looking. */
function message(escrow: Escrow, viewer: JobParty): string {
  const t = escrowTotals(escrow);
  const isJob = escrow.subject.kind === PAYMENT_SUBJECT.Job;
  const isCustomer = viewer === JOB_ACTOR.Customer;
  const hours = isJob ? ESCROW_CONFIG.jobAutoReleaseHours : ESCROW_CONFIG.orderAutoReleaseHours;
  switch (escrow.status) {
    case ESCROW_STATUS.Held:
      return isCustomer ?
      `${escrow.vendorName} gets it when you confirm ${isJob ? 'the work is done' : 'you have your order'}, or automatically ${hours} hours after they mark it ${isJob ? 'done' : 'delivered or collected'}. If it’s cancelled, you’re refunded under the cancellation policy.${t.refunded ? ` ${formatNaira(t.refunded)} has already been refunded.` : ''}` :
      `Released to you when ${escrow.customerName} confirms, or automatically ${hours} hours after you mark it ${isJob ? 'done' : 'delivered or collected'}. A ${Math.round(ESCROW_CONFIG.commissionRate * 100)}% platform commission is taken at release.`;
    case ESCROW_STATUS.Disputed:
      return 'On hold while Gwani’s team reviews the reported problem. Nobody can move this money until it’s resolved.';
    case ESCROW_STATUS.Released:
      return isCustomer ?
      `Released to ${escrow.vendorName} on ${lastAt(escrow, ESCROW_EVENT.Released)}.` :
      `Released to you on ${lastAt(escrow, ESCROW_EVENT.Released)}: ${formatNaira(t.vendorNet)} after ${formatNaira(t.commission)} commission.`;
    case ESCROW_STATUS.Refunded:
      return `${formatNaira(t.refunded)} refunded to ${isCustomer ? 'you' : escrow.customerName} on ${lastAt(escrow, ESCROW_EVENT.Refunded)}.`;
    case ESCROW_STATUS.PartiallyRefunded:
      return `${formatNaira(t.refunded)} refunded to ${isCustomer ? 'you' : escrow.customerName}, ${formatNaira(t.released)} released to ${isCustomer ? escrow.vendorName : 'you'}${isCustomer ? '' : ` (${formatNaira(t.vendorNet)} after commission)`}.`;
  }
}

/** "Held securely until the job is complete" — the escrow amount, status and what happens next. */
export function EscrowBanner({ escrow, viewer }: {escrow: Escrow;viewer: JobParty;}) {
  const t = escrowTotals(escrow);
  const holding = escrow.status === ESCROW_STATUS.Held || escrow.status === ESCROW_STATUS.Disputed;
  const title = holding ?
  `Held securely until ${escrow.subject.kind === PAYMENT_SUBJECT.Job ? 'the job is complete' : 'you have your order'}` :
  'Escrow settled';
  return (
    <div role="status" className={`rounded-xl border px-3 py-3 text-sm ${holding ? 'border-[#2B4A7A]/25 bg-[#E4EAF3]' : 'border-line bg-sand'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 font-bold text-ink">
          <ShieldCheckIcon className="h-4 w-4 shrink-0 text-[#2B4A7A]" aria-hidden="true" />
          {viewer === JOB_ACTOR.Vendor && holding ? 'Customer’s payment held in escrow' : title}
        </p>
        <EscrowStatusBadge status={escrow.status} />
      </div>
      <p className="mt-1 text-ink">
        <Price amount={holding ? t.held : escrow.gross} className="text-base font-extrabold" />
        {holding && t.held !== escrow.gross && <span className="text-muted"> of {formatNaira(escrow.gross)} paid</span>}
      </p>
      <p className="mt-1 text-muted">{message(escrow, viewer)}</p>
    </div>);

}
