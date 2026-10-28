import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('payments');
  function finish(outcome: 'success' | 'declined') {
    completeHostedCheckout(reference, outcome);
    onReturn();
  }

  return (
    <Dialog open={open} onClose={onClosed} title={t('hosted.title', { provider: MOCK_PSP.providerName })} description={t('hosted.description')}>
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-sand p-3 text-sm">
          <p className="flex items-center gap-1.5 font-bold text-ink">
            <ShieldCheckIcon className="h-4 w-4 text-pine" aria-hidden="true" />
            {t('hosted.payGwani')} <Price amount={amount} className="ml-auto text-base" />
          </p>
          <p className="mt-1 break-all font-mono text-xs text-muted">{checkoutUrl}</p>
          <p className="mt-1 text-xs text-muted">{t('hosted.reference', { reference })}</p>
        </div>
        <p className="text-sm text-muted">
          {t('hosted.text')}
        </p>
        <div className="grid gap-2">
          <Button onClick={() => finish('success')}>{t('hosted.success')}</Button>
          <Button variant="outline" onClick={() => finish('declined')}>
            {t('hosted.declined')}
          </Button>
          <Button variant="outline" onClick={onTimeout}>
            {t('hosted.timeout')}
          </Button>
          <Button variant="ghost" onClick={onClosed}>
            {t('hosted.close')}
          </Button>
        </div>
      </div>
    </Dialog>);

}
