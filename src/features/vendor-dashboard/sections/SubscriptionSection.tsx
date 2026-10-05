import { PageHeader } from '../../../components/PageHeader';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { ExpiryBanner } from '../components/subscription/ExpiryBanner';
import { PlanActionDialog } from '../components/subscription/PlanActionDialog';
import { PlanComparison } from '../components/subscription/PlanComparison';
import { SubscriptionStatusCard } from '../components/subscription/SubscriptionStatusCard';
import { useSubscription } from '../hooks/useSubscription';

export function SubscriptionSection() {
  const s = useSubscription();

  function renderBody() {
    if (s.status === 'error') return <ErrorState message={s.error ?? ''} onRetry={s.reload} />;
    if (!s.subscription || !s.catalogue || !s.subscriptionStatus) {
      return <LoadingState label="Loading your subscription" rows={2} rowClassName="h-48" />;
    }
    if (!s.currentPlan) {
      return <ErrorState title="Plan not found" message="We couldn’t match your subscription to a plan. Please contact support." />;
    }
    return (
      <div className="space-y-8">
        <ExpiryBanner status={s.subscriptionStatus} daysLeft={s.daysLeft} renewsOn={s.subscription.renewsOn} onRenew={s.requestRenew} />
        <div className="max-w-md">
          <SubscriptionStatusCard
            plan={s.currentPlan}
            subscription={s.subscription}
            status={s.subscriptionStatus}
            daysLeft={s.daysLeft}
            onRenew={s.requestRenew} />

        </div>
        <PlanComparison catalogue={s.catalogue} currentPlanId={s.subscription.planId} onChoose={s.requestSwitch} />
      </div>);

  }

  return (
    <>
      <PageHeader title="Subscription" subtitle="Your plan, renewal date and what each plan includes" />
      <PageContainer>{renderBody()}</PageContainer>
      <PlanActionDialog action={s.pending} loading={s.saving} onConfirm={s.confirm} onCancel={s.cancel} />
    </>);

}
