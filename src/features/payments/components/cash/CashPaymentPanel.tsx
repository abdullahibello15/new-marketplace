import { Trans, useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2Icon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { buttonClasses } from '../../../../components/ui/buttonStyles';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { formatNaira } from '../../../../utils/format';
import { PAYMENT_METHOD, PAYMENT_SUBJECT } from '../../constants';
import { CashNote } from '../CashNote';
import type { Payable, Payment, PaymentInitiation, PaymentMethodChoice } from '../../types';

interface CashPaymentPanelProps {
  payable: Payable;
  /** Set once cash has been chosen. */
  payment: Payment | null;
  starting: boolean;
  initiate: (choice: PaymentMethodChoice) => Promise<PaymentInitiation | null>;
}

/** Choosing cash on completion: the caveat, a confirmation, then what happens next. */
export function CashPaymentPanel({ payable, payment, starting, initiate }: CashPaymentPanelProps) {
  const { t } = useTranslation('payments');
  const [confirming, setConfirming] = useState(false);
  const chosen = payment?.method === PAYMENT_METHOD.Cash;
  const isJob = payable.subject.kind === PAYMENT_SUBJECT.Job;
  const when = isJob ? t('cash.whenJob') : t('cash.whenOrder');

  if (chosen) {
    return (
      <div className="space-y-3">
        <p role="status" className="flex gap-2 rounded-xl bg-[#E3EEEC] px-3 py-2.5 text-sm text-ink">
          <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
          <span>{t(isJob ? 'cash.setJob' : 'cash.setOrder', { name: payable.vendorName, amount: formatNaira(payable.total) })}</span>
        </p>
        <CashNote />
        <Link to={payable.returnPath} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
          {t('checkout.backTo', { title: payable.title })}
        </Link>
      </div>);

  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">
        <Trans t={t} i18nKey="cash.intro" values={{ name: payable.vendorName, amount: formatNaira(payable.total), when }} components={{ strong: <strong /> }} />
      </p>
      <CashNote />
      <Button fullWidth loading={starting} onClick={() => setConfirming(true)}>
        {t('cash.choose')}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={t('cash.dialogTitle')}
        description={t('cash.dialogChoose')}
        confirmLabel={t('cash.yes')}
        cancelLabel={t('cash.goBack')}
        loading={starting}
        onConfirm={async () => {
          if (await initiate({ method: PAYMENT_METHOD.Cash })) setConfirming(false);
        }}
        onCancel={() => setConfirming(false)} />

    </div>);

}
