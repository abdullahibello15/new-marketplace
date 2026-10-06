import { format } from 'date-fns';
import { Loader2Icon } from 'lucide-react';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { Price } from '../../../../components/ui/Price';
import { INVOICE_KIND } from '../../constants';
import type { PendingPlanAction } from '../../hooks/useSubscription';
import type { InvoiceQuote } from '../../types';

interface PlanActionDialogProps {
  action: PendingPlanAction | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const day = (iso: string) => format(new Date(iso), 'EEE d MMM yyyy');

/** When the change applies, in words. */
function effectText(q: InvoiceQuote, planName: string): string {
  switch (q.kind) {
    case INVOICE_KIND.Upgrade:
      return `${planName} starts as soon as the payment goes through. Your renewal date stays ${day(q.periodEnd)}.`;
    case INVOICE_KIND.Downgrade:
      return `You keep your current plan until it ends. ${planName} starts on ${day(q.effectiveAt)} and runs until ${day(q.periodEnd)}.`;
    case INVOICE_KIND.Subscribe:
      return `${planName} starts as soon as the payment goes through, and your profile is visible again. It runs until ${day(q.periodEnd)}.`;
    case INVOICE_KIND.Renew:
      return `Adds a month: ${planName} then runs until ${day(q.periodEnd)}.`;
  }
}

/** Shows exactly what will be charged (with the proration working for upgrades) before going to payment. */
export function PlanActionDialog({ action, loading, onConfirm, onCancel }: PlanActionDialogProps) {
  const q = action?.quote ?? null;
  const name = action?.plan.name ?? '';
  const title = action?.kind === 'renew' ? `Renew ${name}?` : q?.kind === INVOICE_KIND.Upgrade ? `Upgrade to ${name}?` : `Switch to ${name}?`;

  return (
    <ConfirmDialog
      open={action !== null}
      title={title}
      description={
      !q ?
      <span role="status" className="flex items-center gap-2">
            <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
            Working out the price…
          </span> :

      <span className="block space-y-3">
            <span className="block">{effectText(q, name)}</span>
            <span className="block rounded-xl bg-sand p-3">
              {q.lines.map((l) =>
          <span key={l.label} className="flex justify-between gap-3 text-ink">
                  <span className="min-w-0">{l.label}</span>
                  <span className="shrink-0">
                    {l.amount < 0 && '−'}
                    <Price amount={Math.abs(l.amount)} />
                  </span>
                </span>
          )}
              <span className="mt-2 flex justify-between gap-3 border-t border-line pt-2 font-bold text-ink">
                <span>To pay now</span>
                <Price amount={q.amount} />
              </span>
            </span>
            <span className="block text-xs">You’ll pay by card, bank transfer or USSD on the next screen.</span>
          </span>
      }
      confirmLabel="Continue to payment"
      loading={loading || !q}
      onConfirm={onConfirm}
      onCancel={onCancel} />);


}
