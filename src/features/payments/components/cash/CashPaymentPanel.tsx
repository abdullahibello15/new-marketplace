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
  const [confirming, setConfirming] = useState(false);
  const chosen = payment?.method === PAYMENT_METHOD.Cash;
  const when = payable.subject.kind === PAYMENT_SUBJECT.Job ? 'after the job is done' : 'when you collect your order';

  if (chosen) {
    return (
      <div className="space-y-3">
        <p role="status" className="flex gap-2 rounded-xl bg-[#E3EEEC] px-3 py-2.5 text-sm text-ink">
          <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
          <span>
            Cash on completion is set. Pay {payable.vendorName} {formatNaira(payable.total)} {when}, then confirm the amount on the{' '}
            {payable.subject.kind} page. They confirm it too.
          </span>
        </p>
        <CashNote />
        <Link to={payable.returnPath} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
          Back to {payable.title}
        </Link>
      </div>);

  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">
        Pay {payable.vendorName} <strong>{formatNaira(payable.total)}</strong> in cash {when}. You’ll both confirm the amount in the app.
      </p>
      <CashNote />
      <Button fullWidth loading={starting} onClick={() => setConfirming(true)}>
        Pay cash on completion
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Pay in cash?"
        description="Cash payments aren’t covered by Gwani’s escrow or refunds. You can still switch to an online method before the work is done."
        confirmLabel="Yes, I’ll pay cash"
        cancelLabel="Go back"
        loading={starting}
        onConfirm={async () => {
          if (await initiate({ method: PAYMENT_METHOD.Cash })) setConfirming(false);
        }}
        onCancel={() => setConfirming(false)} />

    </div>);

}
