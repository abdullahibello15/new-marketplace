import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { WalletIcon } from 'lucide-react';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { Price } from '../../../components/ui/Price';
import { formatNaira } from '../../../utils/format';
import { JOB_ACTOR } from '../../jobs/constants';
import { FINAL_PAYMENT_STATUSES, PAYMENT_METHOD, PAYMENT_METHOD_META, PAYMENT_ROUTES, PAYMENT_STATUS, PAYMENT_SUBJECT } from '../constants';
import { useSubjectPayment } from '../hooks/useSubjectPayment';
import { CashNote } from './CashNote';
import { PaymentOutcome } from './PaymentOutcome';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { EscrowBanner } from './escrow/EscrowBanner';
import { EscrowLedger } from './escrow/EscrowLedger';
import { CashConfirmationForm } from './cash/CashConfirmationForm';
import type { JobParty } from '../../jobs/types';
import type { CashConfirmation, PaymentSubjectKind } from '../types';

interface PaymentCardProps {
  kind: PaymentSubjectKind;
  id: string;
  /** The job's or order's updatedAt: reloads the payment when the work moves on. */
  refreshKey: string;
  viewer: JobParty;
  /** The other person's name: the vendor (customer view) or the customer (vendor view). */
  otherName: string;
}

const when = (iso: string) => format(new Date(iso), 'd MMM, h:mm a');

/** One side's cash confirmation, in words. */
function cashLine(cash: CashConfirmation, side: JobParty, viewer: JobParty, otherName: string): string {
  const amount = side === JOB_ACTOR.Vendor ? cash.vendorAmount : cash.customerAmount;
  const at = side === JOB_ACTOR.Vendor ? cash.vendorConfirmedAt : cash.customerConfirmedAt;
  const who = side === viewer ? 'You' : otherName;
  if (amount === null || !at) return `${who}: not confirmed yet`;
  return `${who}: ${side === JOB_ACTOR.Vendor ? 'received' : 'paid'} ${formatNaira(amount)} (${when(at)})`;
}

/**
 * Payment on a job or order page, for either side: what's due and "Pay now" (customer), progress of an
 * online payment and where the money stands in escrow (with its ledger), the cash confirmations once the
 * work is done, and a receipt link when it's paid.
 */
export function PaymentCard({ kind, id, refreshKey, viewer, otherName }: PaymentCardProps) {
  const { data, status, error, reload, replacePayment } = useSubjectPayment(kind, id, refreshKey);
  const isCustomer = viewer === JOB_ACTOR.Customer;

  if (status === 'error') {
    return (
      <p role="alert" className="rounded-2xl border border-clay/40 bg-clay-soft px-4 py-3 text-sm text-ink">
        Couldn’t load the payment.{' '}
        <button type="button" onClick={reload} className="rounded font-semibold text-clay-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">
          Try again
        </button>
        <span className="sr-only">{error}</span>
      </p>);

  }
  if (!data) return <div role="status" aria-label="Loading payment" className="h-24 animate-pulse rounded-2xl bg-sand" />;

  const { payable, payment, escrow } = data;
  // Nothing to show before there's anything to pay (e.g. no accepted quote yet).
  if (!payment && payable.blockedReason) return null;

  const open = payment !== null && !FINAL_PAYMENT_STATUSES.includes(payment.status);
  const cash = payment?.method === PAYMENT_METHOD.Cash ? payment.cash : null;
  const mySideDone = cash ? (isCustomer ? cash.customerAmount : cash.vendorAmount) !== null : false;
  const canPayAgain = isCustomer && !payable.blockedReason && (!payment || payment.status === PAYMENT_STATUS.Failed || payment.status === PAYMENT_STATUS.Expired);

  return (
    <section aria-labelledby={`payment-${kind}-${id}`} className="space-y-3 rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 id={`payment-${kind}-${id}`} className="flex items-center gap-2 text-base font-bold text-ink">
          <WalletIcon className="h-4 w-4 text-muted" aria-hidden="true" />
          Payment
        </h2>
        {payment ? <PaymentStatusBadge status={payment.status} /> : <span className="text-sm font-semibold text-muted">Not paid yet</span>}
      </div>
      <p className="text-sm text-muted">
        <Price amount={payment?.amount ?? payable.total} className="text-base font-bold text-ink" />
        {payment && ` · ${PAYMENT_METHOD_META[payment.method].label}`}
        {payment?.paidAt && payment.status === PAYMENT_STATUS.Paid && ` · paid ${when(payment.paidAt)}`}
      </p>

      {escrow && <EscrowBanner escrow={escrow} viewer={viewer} />}
      {payment && <PaymentOutcome payment={payment} />}

      {cash && payment &&
      <>
          <ul className="space-y-0.5 text-sm text-ink">
            <li>{cashLine(cash, JOB_ACTOR.Customer, viewer, otherName)}</li>
            <li>{cashLine(cash, JOB_ACTOR.Vendor, viewer, otherName)}</li>
          </ul>
          {payment.status !== PAYMENT_STATUS.Paid && !mySideDone && (
        payable.cashConfirmable ?
        <CashConfirmationForm payment={payment} party={viewer} otherName={otherName} onUpdated={replacePayment} /> :
        <p className="text-sm text-muted">
                {isCustomer ?
          `Pay ${formatNaira(payment.amount)} in cash once ${kind === PAYMENT_SUBJECT.Job ? 'the work is done' : 'you have your order'}, then confirm it here.` :
          `Confirm the cash here once ${kind === PAYMENT_SUBJECT.Job ? 'you’ve marked the work done' : 'the order is collected'} and you’ve been paid.`}
              </p>)
        }
          {isCustomer && payment.status !== PAYMENT_STATUS.Paid && <CashNote />}
        </>
      }

      {isCustomer && open && !cash && payment &&
      <Link to={PAYMENT_ROUTES.checkout(kind, id)} className={buttonClasses({ fullWidth: true })}>
          Continue payment
        </Link>
      }
      {!isCustomer && open && !cash && <p className="text-sm text-muted">{otherName} has started paying online. You’ll see it here once it’s confirmed.</p>}
      {!isCustomer && !payment && <p className="text-sm text-muted">{otherName} hasn’t paid yet.</p>}

      {canPayAgain &&
      <Link to={PAYMENT_ROUTES.checkout(kind, id)} className={buttonClasses({ fullWidth: true })}>
          Pay <Price amount={payable.total} />
        </Link>
      }
      {escrow && <EscrowLedger escrow={escrow} showCommission={!isCustomer} />}
      {payment && (payment.status === PAYMENT_STATUS.Paid || payment.status === PAYMENT_STATUS.Refunded) &&
      <Link to={PAYMENT_ROUTES.receipt(payment.reference)} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
          View receipt
        </Link>
      }
    </section>);

}
