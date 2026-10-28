import { useTranslation } from 'react-i18next';
import i18n from '../../../../i18n';
import { planName } from '../../../../i18n/labels';
import { formatDate as format } from '../../../../utils/format';
import { Button } from '../../../../components/ui/Button';
import { Price } from '../../../../components/ui/Price';
import { BUNDLE_RULES } from '../../bundles';
import type { InvoiceQuote, SubscriptionPlan } from '../../types';
import { translate } from '../../../../i18n/message';

interface BundleSummaryProps {
  plan: SubscriptionPlan;
  renewal: {quote: InvoiceQuote | null;blockedReason: string | null;};
  additions: {quote: InvoiceQuote | null;blockedReason: string | null;};
  busy: string | null;
  onPay: (kind: 'renewal' | 'additions') => void;
}

/** Invoice lines: one per member, then the discount. Credits show with a minus sign. */
function Lines({ quote }: {quote: InvoiceQuote;}) {
  const { t } = useTranslation('vendor');
  return (
    <dl className="space-y-1 text-sm">
      {quote.lines.map((l) =>
      <div key={translate(l.label)} className="flex justify-between gap-3">
          <dt className="min-w-0 text-muted">{translate(l.label)}</dt>
          <dd className={l.amount < 0 ? 'text-pine' : 'text-ink'}>
            {l.amount < 0 && '−'}
            <Price amount={Math.abs(l.amount)} />
          </dd>
        </div>
      )}
      <div className="flex justify-between gap-3 border-t border-line pt-2 font-bold text-ink">
        <dt>{t('subscription.receipt.total')}</dt>
        <dd>
          <Price amount={quote.amount} className="text-lg font-extrabold" />
        </dd>
      </div>
    </dl>);

}

const tiersText = () => BUNDLE_RULES.discountTiers.map((tier) => i18n.t('vendor:association.tier', { percent: tier.percentOff, count: tier.minMembers })).join(', ');

/** What the bundle costs, line by line, with Pay buttons for the renewal and for newly added members. */
export function BundleSummary({ plan, renewal, additions, busy, onPay }: BundleSummaryProps) {
  const { t } = useTranslation('vendor');
  return (
    <div className="space-y-4">
      {additions.quote &&
      <section aria-labelledby="additions-heading" className="rounded-2xl border border-mustard bg-white p-4 lg:p-5">
          <h3 id="additions-heading" className="font-bold text-ink">{t('association.newMembersTitle')}</h3>
          <p className="mb-3 text-sm text-muted">{t('association.newMembersText', { date: format(additions.quote.periodEnd, 'd MMM yyyy') })}</p>
          <Lines quote={additions.quote} />
          <Button fullWidth className="mt-3" loading={busy === 'additions'} disabled={busy !== null} onClick={() => onPay('additions')}>
            {t('association.payNewMembers')} <Price amount={additions.quote.amount} />
          </Button>
        </section>
      }

      <section aria-labelledby="renewal-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
        <h3 id="renewal-heading" className="font-bold text-ink">{t('association.nextRenewal')}</h3>
        <p className="mb-3 text-sm text-muted">
          {t('association.everyMember', { plan: planName(plan.id, plan.name) })} (<Price amount={plan.price} /> {t('association.perMonthEach')}).{' '}
          {t('association.discountRules', { tiers: tiersText(), min: BUNDLE_RULES.minMembers, max: BUNDLE_RULES.maxMembers })}
        </p>
        {renewal.quote ?
        <>
            <Lines quote={renewal.quote} />
            <p className="mt-2 text-xs text-muted">
              {t('association.covers', { from: format(renewal.quote.periodStart, 'd MMM'), to: format(renewal.quote.periodEnd, 'd MMM yyyy') })}
            </p>
            <Button fullWidth className="mt-3" loading={busy === 'renewal'} disabled={busy !== null} onClick={() => onPay('renewal')}>
              {t('association.payRenewal')} <Price amount={renewal.quote.amount} />
            </Button>
          </> :

        <p role="status" className="rounded-xl bg-sand px-3 py-2 text-sm text-ink">{renewal.blockedReason}</p>
        }
        <p className="mt-2 text-xs text-muted">{t('association.payNote')}</p>
      </section>
    </div>);

}
