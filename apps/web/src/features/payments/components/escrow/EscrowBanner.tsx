import { useTranslation } from 'react-i18next';
import i18n from '../../../../i18n';
import { ShieldCheckIcon } from 'lucide-react';
import { Price } from '../../../../components/ui/Price';
import { formatDate, formatNaira } from '../../../../utils/format';
import { JOB_ACTOR } from '../../../jobs/constants';
import { ESCROW_EVENT, ESCROW_STATUS, PAYMENT_SUBJECT } from '../../constants';
import { ESCROW_CONFIG } from '../../escrow/escrowConfig';
import { escrowTotals } from '../../escrow/escrowRules';
import { EscrowStatusBadge } from './EscrowStatusBadge';
import type { JobParty } from '../../../jobs/types';
import type { Escrow } from '../../types';

const lastAt = (escrow: Escrow, type: Escrow['ledger'][number]['type']) => {
  const at = [...escrow.ledger].reverse().find((e) => e.type === type)?.at;
  return at ? formatDate(at, 'd MMM') : '';
};

/** Where the customer's money is right now, in plain words, for whoever is looking. */
function message(escrow: Escrow, viewer: JobParty): string {
  const t = escrowTotals(escrow);
  const isJob = escrow.subject.kind === PAYMENT_SUBJECT.Job;
  const isCustomer = viewer === JOB_ACTOR.Customer;
  const hours = isJob ? ESCROW_CONFIG.jobAutoReleaseHours : ESCROW_CONFIG.orderAutoReleaseHours;
  const tr = (key: string, options: Record<string, unknown> = {}) => i18n.t(`payments:escrow.${key}`, options);
  switch (escrow.status) {
    case ESCROW_STATUS.Held:
      return isCustomer ?
      tr(isJob ? 'heldCustomerJob' : 'heldCustomerOrder', { vendor: escrow.vendorName, hours }) + (t.refunded ? tr('alreadyRefunded', { amount: formatNaira(t.refunded) }) : '') :
      tr(isJob ? 'heldVendorJob' : 'heldVendorOrder', { customer: escrow.customerName, hours, percent: Math.round(ESCROW_CONFIG.commissionRate * 100) });
    case ESCROW_STATUS.Disputed:
      return tr('disputed');
    case ESCROW_STATUS.Released:
      return isCustomer ?
      tr('releasedCustomer', { vendor: escrow.vendorName, date: lastAt(escrow, ESCROW_EVENT.Released) }) :
      tr('releasedVendor', { date: lastAt(escrow, ESCROW_EVENT.Released), net: formatNaira(t.vendorNet), commission: formatNaira(t.commission) });
    case ESCROW_STATUS.Refunded:
      return isCustomer ?
      tr('refundedCustomer', { amount: formatNaira(t.refunded), date: lastAt(escrow, ESCROW_EVENT.Refunded) }) :
      tr('refundedVendor', { amount: formatNaira(t.refunded), customer: escrow.customerName, date: lastAt(escrow, ESCROW_EVENT.Refunded) });
    case ESCROW_STATUS.PartiallyRefunded:
      return isCustomer ?
      tr('partialCustomer', { refunded: formatNaira(t.refunded), released: formatNaira(t.released), vendor: escrow.vendorName }) :
      tr('partialVendor', { refunded: formatNaira(t.refunded), released: formatNaira(t.released), customer: escrow.customerName, net: formatNaira(t.vendorNet) });
  }
}

/** "Held securely until the job is complete" — the escrow amount, status and what happens next. */
export function EscrowBanner({ escrow, viewer }: {escrow: Escrow;viewer: JobParty;}) {
  const { t: tr } = useTranslation('payments');
  const t = escrowTotals(escrow);
  const holding = escrow.status === ESCROW_STATUS.Held || escrow.status === ESCROW_STATUS.Disputed;
  const title = holding ?
  tr(escrow.subject.kind === PAYMENT_SUBJECT.Job ? 'escrow.heldUntilJob' : 'escrow.heldUntilOrder') :
  tr('escrow.settled');
  return (
    <div role="status" className={`rounded-xl border px-3 py-3 text-sm ${holding ? 'border-[#2B4A7A]/25 bg-[#E4EAF3]' : 'border-line bg-sand'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 font-bold text-ink">
          <ShieldCheckIcon className="h-4 w-4 shrink-0 text-[#2B4A7A]" aria-hidden="true" />
          {viewer === JOB_ACTOR.Vendor && holding ? tr('escrow.vendorHeld') : title}
        </p>
        <EscrowStatusBadge status={escrow.status} />
      </div>
      <p className="mt-1 text-ink">
        <Price amount={holding ? t.held : escrow.gross} className="text-base font-extrabold" />
        {holding && t.held !== escrow.gross && <span className="text-muted">{tr('escrow.ofPaid', { amount: formatNaira(escrow.gross) })}</span>}
      </p>
      <p className="mt-1 text-muted">{message(escrow, viewer)}</p>
    </div>);

}
