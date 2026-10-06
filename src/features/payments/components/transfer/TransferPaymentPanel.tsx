import { useEffect } from 'react';
import { BanknoteIcon, SendIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { formatNaira } from '../../../../utils/format';
import { MOCK_PSP, PAYMENT_CONFIG, SHOW_PAYMENT_SIMULATOR } from '../../config';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../../constants';
import { useTransferPayment, type TransferSimulation } from '../../hooks/useTransferPayment';
import { CopyField } from '../CopyField';
import { DemoSimulator } from '../DemoSimulator';
import { ExpiryCountdown } from '../ExpiryCountdown';
import { PaymentOutcome } from '../PaymentOutcome';
import { PollingStatus } from '../PollingStatus';
import type { Payment, PaymentInitiation, PaymentMethodChoice } from '../../types';

interface TransferPaymentPanelProps {
  /** The open transfer payment, if one has been started. */
  payment: Payment | null;
  starting: boolean;
  initiate: (choice: PaymentMethodChoice) => Promise<PaymentInitiation | null>;
  onPayment: (p: Payment) => void;
  onPaid: (p: Payment) => void;
}

const SIMULATIONS: {id: TransferSimulation;label: string;}[] = [
{ id: 'exact', label: 'Send the exact amount' },
{ id: 'short', label: `Send ${formatNaira(MOCK_PSP.testDifference)} less` },
{ id: 'extra', label: `Send ${formatNaira(MOCK_PSP.testDifference)} more` },
{ id: 'nothing', label: 'Nothing arrives' }];


/** One-time account details, exact amount, countdown, "I've sent the money" with polling, and clear outcomes. */
export function TransferPaymentPanel({ payment, starting, initiate, onPayment, onPaid }: TransferPaymentPanelProps) {
  const t = useTransferPayment(payment, onPayment);
  const ended = payment !== null && (payment.status === PAYMENT_STATUS.Expired || payment.status === PAYMENT_STATUS.Failed);

  useEffect(() => {
    if (payment?.status === PAYMENT_STATUS.Paid) onPaid(payment);
  }, [payment, onPaid]);

  if (!payment || ended) {
    return (
      <div className="space-y-3">
        {payment && <PaymentOutcome payment={payment} />}
        <p className="text-sm text-muted">
          We’ll give you a one-time account number for this payment. It works for {PAYMENT_CONFIG.transferExpiryMinutes} minutes.
        </p>
        <Button fullWidth icon={BanknoteIcon} loading={starting} onClick={() => void initiate({ method: PAYMENT_METHOD.Transfer })}>
          {ended ? 'Get a new account number' : 'Show account details'}
        </Button>
      </div>);

  }
  const details = payment.transfer;
  const due = t.outstanding || payment.amount;

  return (
    <div className="space-y-3">
      {payment.expiresAt && <ExpiryCountdown expiresAt={payment.expiresAt} what="account number" />}
      <p className="text-sm text-ink">
        Transfer <strong>exactly {formatNaira(due)}</strong> from your banking app to this account. Use it for this payment only.
      </p>
      {details &&
      <>
          <CopyField label="Account number" display={details.accountNumber} large />
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-sand px-3 py-2">
              <dt className="text-xs font-semibold text-muted">Bank</dt>
              <dd className="font-bold text-ink">{details.bankName}</dd>
            </div>
            <div className="rounded-xl bg-sand px-3 py-2">
              <dt className="text-xs font-semibold text-muted">Account name</dt>
              <dd className="font-bold text-ink">{details.accountName}</dd>
            </div>
          </dl>
          <CopyField label="Amount" display={formatNaira(due)} copyValue={String(due)} />
        </>
      }

      <PaymentOutcome payment={payment} />
      {payment.status === PAYMENT_STATUS.Processing &&
      <p role="status" className="rounded-xl bg-[#E4EAF3] px-3 py-2 text-sm text-[#2B4A7A]">
          A transfer is on its way. We’re confirming it with the bank…
        </p>
      }

      {SHOW_PAYMENT_SIMULATOR && !t.poll.polling &&
      <DemoSimulator title="what your bank sends" options={SIMULATIONS} value={t.simulation} onChange={t.setSimulation} />
      }

      {!t.poll.polling &&
      <Button fullWidth icon={SendIcon} onClick={t.sent}>
          {t.partlyPaid ? `I’ve sent the remaining ${formatNaira(t.outstanding)}` : 'I’ve sent the money'}
        </Button>
      }
      {(t.claimedSent || t.poll.lastCheckedAt) &&
      <PollingStatus
        polling={t.poll.polling}
        checking={t.poll.checking}
        lastCheckedAt={t.poll.lastCheckedAt}
        gaveUp={t.poll.gaveUp}
        onCheckNow={() => void t.poll.checkNow()} />

      }
      <p className="text-xs text-muted">Transfers usually arrive within a minute. Paying the wrong amount? We’ll tell you what to do.</p>
    </div>);

}
