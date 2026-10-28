import { useTranslation } from 'react-i18next';
import i18n from '../../../../i18n';
import { planName } from '../../../../i18n/labels';
import { formatDate } from '../../../../utils/format';
import { Loader2Icon } from 'lucide-react';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { Price } from '../../../../components/ui/Price';
import { INVOICE_KIND } from '../../constants';
import type { PendingPlanAction } from '../../hooks/useSubscription';
import type { InvoiceQuote } from '../../types';
import { translate } from '../../../../i18n/message';

interface PlanActionDialogProps {
  action: PendingPlanAction | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const day = (iso: string) => formatDate(iso, 'EEE d MMM yyyy');
const tt = (key: string, options: Record<string, unknown>) => i18n.t(`vendor:subscription.effect.${key}`, options);

/** When the change applies, in words. */
function effectText(q: InvoiceQuote, name: string): string {
  switch (q.kind) {
    case INVOICE_KIND.Upgrade:
      return tt('upgrade', { plan: name, date: day(q.periodEnd) });
    case INVOICE_KIND.Downgrade:
      return tt('downgrade', { plan: name, start: day(q.effectiveAt), end: day(q.periodEnd) });
    case INVOICE_KIND.Subscribe:
      return tt('subscribe', { plan: name, date: day(q.periodEnd) });
    case INVOICE_KIND.Renew:
    case INVOICE_KIND.BundleRenewal:
      return tt('renew', { plan: name, date: day(q.periodEnd) });
    case INVOICE_KIND.BundleMembers:
      return tt('members', { date: day(q.periodEnd) });
  }
}

/** Shows exactly what will be charged (with the proration working for upgrades) before going to payment. */
export function PlanActionDialog({ action, loading, onConfirm, onCancel }: PlanActionDialogProps) {
  const { t } = useTranslation('vendor');
  const q = action?.quote ?? null;
  const name = action ? planName(action.plan.id, action.plan.name) : '';
  const title = action?.kind === 'renew' ?
  t('subscription.dialog.renew', { plan: name }) :
  q?.kind === INVOICE_KIND.Upgrade ?
  t('subscription.dialog.upgrade', { plan: name }) :
  t('subscription.dialog.switch', { plan: name });

  return (
    <ConfirmDialog
      open={action !== null}
      title={title}
      description={
      !q ?
      <span role="status" className="flex items-center gap-2">
            <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('subscription.dialog.working')}
          </span> :

      <span className="block space-y-3">
            <span className="block">{effectText(q, name)}</span>
            <span className="block rounded-xl bg-sand p-3">
              {q.lines.map((l) =>
          <span key={translate(l.label)} className="flex justify-between gap-3 text-ink">
                  <span className="min-w-0">{translate(l.label)}</span>
                  <span className="shrink-0">
                    {l.amount < 0 && '−'}
                    <Price amount={Math.abs(l.amount)} />
                  </span>
                </span>
          )}
              <span className="mt-2 flex justify-between gap-3 border-t border-line pt-2 font-bold text-ink">
                <span>{t('subscription.dialog.toPay')}</span>
                <Price amount={q.amount} />
              </span>
            </span>
            <span className="block text-xs">{t('subscription.dialog.payNext')}</span>
          </span>
      }
      confirmLabel={t('subscription.dialog.continue')}
      loading={loading || !q}
      onConfirm={onConfirm}
      onCancel={onCancel} />);


}
