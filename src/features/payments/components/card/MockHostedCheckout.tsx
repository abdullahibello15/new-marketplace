import { ShieldCheckIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { Price } from '../../../../components/ui/Price';
import { MOCK_PSP } from '../../config';
import { completeHostedCheckout } from '../../services/mockPsp';

interface MockHostedCheckoutProps {
  open: boolean;
  reference: string;
  amount: number;
  /** The PSP URL the real popup would load. Shown for clarity only. */
  checkoutUrl: string | null;
  /** The page redirected back: the customer paid or the card was declined. */
  onReturn: () => void;
  /** The customer closed the window. */
  onClosed: () => void;
  /** Simulate the page never answering (the same as the timeout firing). */
  onTimeout: () => void;
}

/**
 * MOCK of the payment provider's hosted checkout popup. In production this is the PSP's own page
 * (an iframe/popup from their domain), and the customer types card details there. This simulation
 * deliberately has no card, CVV or PIN fields: only buttons for each outcome.
 */
export function MockHostedCheckout({ open, reference, amount, checkoutUrl, onReturn, onClosed, onTimeout }: MockHostedCheckoutProps) {
  function finish(outcome: 'success' | 'declined') {
    completeHostedCheckout(reference, outcome);
    onReturn();
  }

  return (
    <Dialog open={open} onClose={onClosed} title={`${MOCK_PSP.providerName} checkout`} description="Simulated hosted payment page">
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-sand p-3 text-sm">
          <p className="flex items-center gap-1.5 font-bold text-ink">
            <ShieldCheckIcon className="h-4 w-4 text-pine" aria-hidden="true" />
            Pay Gwani <Price amount={amount} className="ml-auto text-base" />
          </p>
          <p className="mt-1 break-all font-mono text-xs text-muted">{checkoutUrl}</p>
          <p className="mt-1 text-xs text-muted">Reference {reference}</p>
        </div>
        <p className="text-sm text-muted">
          On the real page you’d enter your card here, on the payment provider’s site. This demo never asks for card details. Choose what
          happens:
        </p>
        <div className="grid gap-2">
          <Button onClick={() => finish('success')}>Simulate: payment succeeds</Button>
          <Button variant="outline" onClick={() => finish('declined')}>
            Simulate: card declined
          </Button>
          <Button variant="outline" onClick={onTimeout}>
            Simulate: page stops responding
          </Button>
          <Button variant="ghost" onClick={onClosed}>
            Close window without paying
          </Button>
        </div>
      </div>
    </Dialog>);

}
