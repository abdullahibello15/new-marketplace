import { Button } from '../../../../components/ui/Button';
import { BILLING_RULES } from '../../plans';
import type { DemoSubscriptionState } from '../../services/subscriptionService';

const STATES: {id: DemoSubscriptionState;label: string;}[] = [
{ id: 'active', label: 'Active (20 days left)' },
{ id: 'expiring', label: 'Ends in 3 days' },
{ id: 'grace', label: 'In grace period' },
{ id: 'limited', label: 'Grace over (limited)' }];


/** MOCK only: moves the subscription's end date so the expiry, grace and limited states can be tried. */
export function SubscriptionDemoControls({ busy, onSimulate }: {busy: boolean;onSimulate: (state: DemoSubscriptionState) => void;}) {
  if (!BILLING_RULES.showDemoControls) return null;
  return (
    <section aria-labelledby="sub-demo-heading" className="rounded-2xl border border-dashed border-mustard bg-[#FBF3DC]/60 p-4">
      <h2 id="sub-demo-heading" className="text-xs font-bold uppercase tracking-wider text-mustard-dark">Demo · try a subscription state</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {STATES.map((s) =>
        <Button key={s.id} variant="outline" size="sm" disabled={busy} onClick={() => onSimulate(s.id)}>
            {s.label}
          </Button>
        )}
      </div>
    </section>);

}
