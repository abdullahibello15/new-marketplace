import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { formatNaira } from '../../../../utils/format';
import { PlanFeatureValue } from './PlanFeatureValue';
import type { PlanFeature, SubscriptionPlan } from '../../types';

interface PlanCardProps {
  plan: SubscriptionPlan;
  features: PlanFeature[];
  isCurrent: boolean;
  onChoose: (plan: SubscriptionPlan) => void;
}

/** One column of the comparison. Every card lists every feature, so plans can be compared row by row. */
export function PlanCard({ plan, features, isCurrent, onChoose }: PlanCardProps) {
  const isFree = plan.monthlyPrice === 0;
  const headingId = `plan-${plan.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className={`flex flex-col rounded-2xl border bg-white p-4 lg:p-5 ${isCurrent ? 'border-pine ring-1 ring-pine' : 'border-line'}`}>

      <div className="flex items-start justify-between gap-2">
        <h3 id={headingId} className="text-lg font-extrabold text-ink">{plan.name}</h3>
        {isCurrent && <Badge tone="success">Your plan</Badge>}
      </div>
      <p className="mt-1">
        <span className="text-2xl font-extrabold tracking-tight text-ink">{isFree ? 'Free' : formatNaira(plan.monthlyPrice)}</span>
        {!isFree && <span className="text-sm font-semibold text-muted"> / month</span>}
      </p>
      <p className="mt-1 text-sm text-muted">{plan.tagline}</p>

      <ul className="mt-4 flex-1 divide-y divide-line border-t border-line text-sm">
        {features.map((f) =>
        <li key={f.label} className="flex items-center justify-between gap-3 py-2">
            <span className="text-muted">{f.label}</span>
            <span className="flex shrink-0 items-center">
              <PlanFeatureValue value={f.values[plan.id]} />
            </span>
          </li>
        )}
      </ul>

      {!isCurrent && !isFree &&
      <Button variant="outline" fullWidth onClick={() => onChoose(plan)} className="mt-4">
          Switch to {plan.name}
        </Button>
      }
    </article>);

}
