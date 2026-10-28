import { Trans, useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Button } from '../../../../components/ui/Button';
import { formatNaira } from '../../../../utils/format';
import { NIGERIAN_BANKS } from '../../../../data/nigerianBanks';
import { field, label, ok } from '../../../../components/vendor/formStyles';
import { PAYMENT_CONFIG, SHOW_PAYMENT_SIMULATOR } from '../../config';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../../constants';
import { useUssdPayment, type UssdSimulation } from '../../hooks/useUssdPayment';
import { CopyField } from '../CopyField';
import { DemoSimulator } from '../DemoSimulator';
import { ExpiryCountdown } from '../ExpiryCountdown';
import { PaymentOutcome } from '../PaymentOutcome';
import { PollingStatus } from '../PollingStatus';
import type { Payment, PaymentInitiation, PaymentMethodChoice } from '../../types';

interface UssdPaymentPanelProps {
  amount: number;
  payment: Payment | null;
  starting: boolean;
  initiate: (choice: PaymentMethodChoice) => Promise<PaymentInitiation | null>;
  onPayment: (p: Payment) => void;
  onPaid: (p: Payment) => void;
}

const SIMULATIONS: UssdSimulation[] = ['approve', 'decline'];


/**
 * USSD payment. Deliberately plain: text, a native select and a big code, no images or animation, so
 * it's quick on low-end phones and slow connections. The PIN is typed on the phone's USSD screen, never here.
 */
export function UssdPaymentPanel({ amount, payment, starting, initiate, onPayment, onPaid }: UssdPaymentPanelProps) {
  const { t } = useTranslation('payments');
  const u = useUssdPayment(payment, onPayment);
  const ended = payment !== null && (payment.status === PAYMENT_STATUS.Expired || payment.status === PAYMENT_STATUS.Failed);

  useEffect(() => {
    if (payment?.status === PAYMENT_STATUS.Paid) onPaid(payment);
  }, [payment, onPaid]);

  const getCode = () => void initiate({ method: PAYMENT_METHOD.Ussd, bankId: u.bankId });

  if (!payment?.ussd || ended) {
    return (
      <div className="space-y-3">
        {payment && <PaymentOutcome payment={payment} />}
        <div>
          <label htmlFor="ussd-bank" className={label}>
            {t('ussd.bank')}
          </label>
          <select id="ussd-bank" value={u.bankId} onChange={(e) => u.setBankId(e.target.value)} className={`${field} ${ok}`}>
            {NIGERIAN_BANKS.map((b) =>
            <option key={b.id} value={b.id}>
                {b.name} ({b.ussdPrefix}#)
              </option>
            )}
          </select>
        </div>
        <Button fullWidth loading={starting} onClick={getCode}>
          {ended ? t('ussd.newCode') : t('ussd.getCode')}
        </Button>
        <p className="text-xs text-muted">{t('ussd.codeNote', { minutes: PAYMENT_CONFIG.ussdExpiryMinutes })}</p>
      </div>);

  }

  return (
    <div className="space-y-3">
      {payment.expiresAt && <ExpiryCountdown expiresAt={payment.expiresAt} what="code" />}
      <CopyField label={t('ussd.codeLabel', { bank: payment.ussd.bankName })} display={payment.ussd.code} large />
      <a
        href={`tel:${payment.ussd.code.replace(/#/g, '%23')}`}
        className="block rounded-xl bg-pine-deep px-4 py-3 text-center font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2">

        {t('ussd.dial', { code: payment.ussd.code })}
      </a>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
        <li>{t('ussd.step1', { bank: payment.ussd.bankName })}</li>
        <li>
          <Trans t={t} i18nKey="ussd.step2" values={{ amount: formatNaira(amount) }} components={{ strong: <strong /> }} />
        </li>
        <li>{t('ussd.step3')}</li>
      </ol>
      <p className="text-xs text-muted">{t('ussd.fee')}</p>

      <PaymentOutcome payment={payment} />
      {SHOW_PAYMENT_SIMULATOR &&
      <div className="space-y-2">
          <DemoSimulator title={t('ussd.simulatorTitle')} options={SIMULATIONS.map((id) => ({ id, label: t(`ussd.${id}`) }))} value={u.simulation} onChange={u.setSimulation} />
          <Button variant="outline" size="sm" onClick={u.simulate}>
            {t('ussd.send')}
          </Button>
        </div>
      }
      <PollingStatus
        polling={u.poll.polling}
        checking={u.poll.checking}
        lastCheckedAt={u.poll.lastCheckedAt}
        gaveUp={u.poll.gaveUp}
        onCheckNow={() => void u.poll.checkNow()} />

    </div>);

}
