import { useEffect } from 'react';
import { CreditCardIcon, Loader2Icon, RotateCwIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Price } from '../../../../components/ui/Price';
import { PAYMENT_STATUS } from '../../constants';
import { useCardPayment } from '../../hooks/useCardPayment';
import { MockHostedCheckout } from './MockHostedCheckout';
import type { Payment, PaymentInitiation, PaymentMethodChoice } from '../../types';

interface CardPaymentPanelProps {
  amount: number;
  initiate: (choice: PaymentMethodChoice) => Promise<PaymentInitiation | null>;
  onPayment: (p: Payment) => void;
  /** Called once the server has verified the payment as Paid. */
  onPaid: (p: Payment) => void;
}

const MESSAGES = {
  closed: 'You closed the payment window before finishing. No money was taken.',
  timeout: 'We didn’t hear back from the payment page. If you finished paying, check again; otherwise try again.'
};

/** "Pay with card" → the PSP's hosted page → verify by reference → success only if the server says Paid. */
export function CardPaymentPanel({ amount, initiate, onPayment, onPaid }: CardPaymentPanelProps) {
  const card = useCardPayment(initiate, (p) => {
    onPayment(p);
    if (p.status === PAYMENT_STATUS.Paid) onPaid(p);
  });
  const retryable = card.stage === 'failed' || card.stage === 'closed' || card.stage === 'timeout';

  // Keep focus sensible for keyboard users when the result appears.
  useEffect(() => {
    if (retryable) document.getElementById('card-result')?.focus();
  }, [retryable]);

  return (
    <div className="space-y-3">
      {card.stage === 'verifying' ?
      <p role="status" className="flex items-center gap-2 rounded-xl bg-sand px-3 py-3 text-sm font-semibold text-ink">
          <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
          Confirming your payment with the bank…
        </p> :

      <Button fullWidth icon={CreditCardIcon} loading={card.stage === 'starting'} disabled={card.busy} onClick={() => void card.pay()}>
          {retryable ? 'Try again' : 'Pay'} <Price amount={amount} /> with card
        </Button>
      }

      {retryable &&
      <div id="card-result" tabIndex={-1} role="alert" className="space-y-2 rounded-xl border border-clay/40 bg-clay-soft px-3 py-2.5 text-sm text-ink focus:outline-none">
          <p>
            {card.stage === 'closed' || card.stage === 'timeout' ?
            MESSAGES[card.stage] :
            card.message ?? 'The payment didn’t go through. No money was taken.'}
          </p>
          {card.stage !== 'failed' &&
        <Button variant="outline" size="sm" icon={RotateCwIcon} onClick={card.checkAgain}>
              Check again
            </Button>
        }
        </div>
      }

      {card.reference &&
      <MockHostedCheckout
        open={card.stage === 'popup'}
        reference={card.reference}
        amount={amount}
        checkoutUrl={card.checkoutUrl}
        onReturn={card.onReturn}
        onClosed={card.onClosed}
        onTimeout={card.onTimeout} />

      }
    </div>);

}
