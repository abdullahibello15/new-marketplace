import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { BILLING_RULES } from '../../plans';
import type { DemoSubscriptionState } from '../../services/subscriptionService';

const STATES: DemoSubscriptionState[] = ['active', 'expiring', 'grace', 'suspended'];


/** MOCK only: moves the end date so the expiry, grace and suspended states can be tried. */
export function SubscriptionDemoControls({ busy, onSimulate, title }: {busy: boolean;onSimulate: (state: DemoSubscriptionState) => void;title?: string;}) {
  const { t } = useTranslation('vendor');
  if (!BILLING_RULES.showDemoControls) return null;
  return (
    <section aria-labelledby="sub-demo-heading" className="rounded-2xl border border-dashed border-mustard bg-[#FBF3DC]/60 p-4">
      <h2 id="sub-demo-heading" className="text-xs font-bold uppercase tracking-wider text-mustard-dark">{title ?? t('subscription.demo.title')}</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {STATES.map((s) =>
        <Button key={s} variant="outline" size="sm" disabled={busy} onClick={() => onSimulate(s)}>
            {t(`subscription.demo.${s}`)}
          </Button>
        )}
      </div>
    </section>);

}
