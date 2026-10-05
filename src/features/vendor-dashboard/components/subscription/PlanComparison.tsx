import { PlanCard } from './PlanCard';
import type { PlanCatalogue, PlanId, SubscriptionPlan } from '../../types';

interface PlanComparisonProps {
  catalogue: PlanCatalogue;
  currentPlanId: PlanId;
  onChoose: (plan: SubscriptionPlan) => void;
}

export function PlanComparison({ catalogue, currentPlanId, onChoose }: PlanComparisonProps) {
  return (
    <section aria-labelledby="plans-heading">
      <h2 id="plans-heading" className="text-xs font-bold uppercase tracking-wider text-muted">Compare plans</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {catalogue.plans.map((plan) =>
        <PlanCard
          key={plan.id}
          plan={plan}
          features={catalogue.features}
          isCurrent={plan.id === currentPlanId}
          onChoose={onChoose} />

        )}
      </div>
    </section>);

}
