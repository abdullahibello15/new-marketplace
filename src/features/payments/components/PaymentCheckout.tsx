import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2Icon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_SUBJECT } from '../constants';
import { receiptPathFor } from '../utils/subject';
import { usePaymentCheckout } from '../hooks/usePaymentCheckout';
import { CardPaymentPanel } from './card/CardPaymentPanel';
import { CashPaymentPanel } from './cash/CashPaymentPanel';
import { PayableSummary } from './PayableSummary';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { SecurePaymentNote } from './SecurePaymentNote';
import { TransferPaymentPanel } from './transfer/TransferPaymentPanel';
import { UssdPaymentPanel } from './ussd/UssdPaymentPanel';
import type { Payment, PaymentSubjectKind } from '../types';

/** One payment screen for jobs and orders: summary, the methods that apply, the total, and the method's own steps. */
export function PaymentCheckout({ kind, id }: {kind: PaymentSubjectKind;id: string;}) {
  const c = usePaymentCheckout({ kind, id });
  const navigate = useNavigate();
  // Only ever called with a payment the server has verified as Paid.
  const onPaid = useCallback((p: Payment) => navigate(receiptPathFor(p), { replace: true }), [navigate]);
  const data = c.overview.data;
  const title = data?.payable.title ?? 'Payment';
  const back = data ? { to: data.payable.returnPath, label: data.payable.title } : undefined;

  function body() {
    if (c.overview.status === 'error') return <ErrorState message={c.overview.error ?? ''} onRetry={c.overview.reload} />;
    if (c.notFound) return <EmptyState icon={SearchXIcon} title="We couldn’t find what you’re paying for" />;
    if (!data) return <LoadingState label="Loading payment" rows={2} rowClassName="h-48" />;
    const { payable } = data;

    if (c.payment?.status === PAYMENT_STATUS.Paid) {
      return (
        <EmptyState
          icon={CheckCircle2Icon}
          title="Already paid"
          description={`${payable.title} is paid. Reference ${c.payment.reference}.`}
          action={
          <Link to={receiptPathFor(c.payment)} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                View receipt
              </Link>
          } />);


    }
    if (payable.blockedReason) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title="Nothing to pay right now"
          description={payable.blockedReason}
          action={
          <Link to={payable.returnPath} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                Back to {payable.title}
              </Link>
          } />);


    }

    const forMethod = c.payment && c.payment.method === c.method ? c.payment : null;
    // A part-paid transfer has to be finished before switching.
    const locked = c.starting || (c.payment?.amountReceived ?? 0) > 0;
    const panelProps = { payment: forMethod, starting: c.starting, initiate: c.initiate, onPayment: c.updatePayment, onPaid };

    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Payment method" className="min-w-0 space-y-4 rounded-2xl border border-line bg-white p-4 lg:p-5">
          <PaymentMethodSelector
            methods={payable.methods}
            value={c.method}
            onChange={c.chooseMethod}
            disabled={locked}
            note={payable.cashUnavailableReason && `Cash isn’t available: ${payable.cashUnavailableReason}`} />

          {c.method === PAYMENT_METHOD.Card && <CardPaymentPanel amount={payable.total} initiate={c.initiate} onPayment={c.updatePayment} onPaid={onPaid} />}
          {c.method === PAYMENT_METHOD.Transfer && <TransferPaymentPanel {...panelProps} />}
          {c.method === PAYMENT_METHOD.Ussd && <UssdPaymentPanel amount={payable.total} {...panelProps} />}
          {c.method === PAYMENT_METHOD.Cash && <CashPaymentPanel payable={payable} payment={forMethod} starting={c.starting} initiate={c.initiate} />}
        </section>
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start" aria-label="Order summary">
          <PayableSummary payable={payable} />
          <SecurePaymentNote escrow={kind !== PAYMENT_SUBJECT.Subscription} />
        </aside>
      </div>);

  }

  return (
    <>
      <PageHeader title={`Pay for ${title}`} subtitle={data?.payable.vendorName} backTo={back} />
      <PageContainer>{body()}</PageContainer>
    </>);

}
