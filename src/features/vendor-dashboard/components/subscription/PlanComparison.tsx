import { PlanCard } from './PlanCard';
import type { PlanCatalogue, PlanId, SubscriptionPlan } from '../../types';

interface PlanComparisonProps {
  catalogue: PlanCatalogue;
  currentPlanId: PlanId;
  /** The profile is limited: plans are offered as new subscriptions. */
  lapsed: boolean;
  onChoose: (plan: SubscriptionPlan) => void;
}

export function PlanComparison({ catalogue, currentPlanId, lapsed, onChoose }: PlanComparisonProps) {
  const currentPrice = catalogue.plans.find((p) => p.id === currentPlanId)?.price ?? 0;
  return (
    <section aria-labelledby="plans-heading">
      <h2 id="plans-heading" className="text-xs font-bold uppercase tracking-wider text-muted">Compare plans</h2>
      <p className="mt-1 text-sm text-muted">Upgrades start straight away (you only pay the difference for the days left). Downgrades start when your current period ends.</p>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {catalogue.plans.map((plan) =>
        <PlanCard
          key={plan.id}
          plan={plan}
          features={catalogue.features}
          isCurrent={plan.id === currentPlanId}
          currentPrice={currentPrice}
          lapsed={lapsed}
          onChoose={onChoose} />

        )}
      </div>
    </section>);

}
