import { Trans, useTranslation } from 'react-i18next';
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

const simulations = (t: (key: string, options?: Record<string, unknown>) => string): {id: TransferSimulation;label: string;}[] => [
{ id: 'exact', label: t('transfer.exact') },
{ id: 'short', label: t('transfer.short', { amount: formatNaira(MOCK_PSP.testDifference) }) },
{ id: 'extra', label: t('transfer.extra', { amount: formatNaira(MOCK_PSP.testDifference) }) },
{ id: 'nothing', label: t('transfer.nothing') }];


/** One-time account details, exact amount, countdown, "I've sent the money" with polling, and clear outcomes. */
export function TransferPaymentPanel({ payment, starting, initiate, onPayment, onPaid }: TransferPaymentPanelProps) {
  const { t: tr } = useTranslation('payments');
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
          {tr('transfer.intro', { minutes: PAYMENT_CONFIG.transferExpiryMinutes })}
        </p>
        <Button fullWidth icon={BanknoteIcon} loading={starting} onClick={() => void initiate({ method: PAYMENT_METHOD.Transfer })}>
          {ended ? tr('transfer.newAccount') : tr('transfer.show')}
        </Button>
      </div>);

  }
  const details = payment.transfer;
  const due = t.outstanding || payment.amount;

  return (
    <div className="space-y-3">
      {payment.expiresAt && <ExpiryCountdown expiresAt={payment.expiresAt} what="account" />}
      <p className="text-sm text-ink">
        <Trans t={tr} i18nKey="transfer.instructions" values={{ amount: formatNaira(due) }} components={{ strong: <strong /> }} />
      </p>
      {details &&
      <>
          <CopyField label={tr('transfer.accountNumber')} display={details.accountNumber} large />
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-sand px-3 py-2">
              <dt className="text-xs font-semibold text-muted">{tr('transfer.bank')}</dt>
              <dd className="font-bold text-ink">{details.bankName}</dd>
            </div>
            <div className="rounded-xl bg-sand px-3 py-2">
              <dt className="text-xs font-semibold text-muted">{tr('transfer.accountName')}</dt>
              <dd className="font-bold text-ink">{details.accountName}</dd>
            </div>
          </dl>
          <CopyField label={tr('transfer.amount')} display={formatNaira(due)} copyValue={String(due)} />
        </>
      }

      <PaymentOutcome payment={payment} />
      {payment.status === PAYMENT_STATUS.Processing &&
      <p role="status" className="rounded-xl bg-[#E4EAF3] px-3 py-2 text-sm text-[#2B4A7A]">
          {tr('transfer.processing')}
        </p>
      }

      {SHOW_PAYMENT_SIMULATOR && !t.poll.polling &&
      <DemoSimulator title={tr('transfer.simulatorTitle')} options={simulations(tr)} value={t.simulation} onChange={t.setSimulation} />
      }

      {!t.poll.polling &&
      <Button fullWidth icon={SendIcon} onClick={t.sent}>
          {t.partlyPaid ? tr('transfer.sentRemaining', { amount: formatNaira(t.outstanding) }) : tr('transfer.sent')}
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
      <p className="text-xs text-muted">{tr('transfer.note')}</p>
    </div>);

}
