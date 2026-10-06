import { Link } from 'react-router-dom';
import { ReceiptTextIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { DASHBOARD_ROUTES, SUBSCRIPTION_STATUS } from '../constants';
import { ExpiryBanner } from '../components/subscription/ExpiryBanner';
import { PlanActionDialog } from '../components/subscription/PlanActionDialog';
import { PlanComparison } from '../components/subscription/PlanComparison';
import { SubscriptionDemoControls } from '../components/subscription/SubscriptionDemoControls';
import { SubscriptionStatusCard } from '../components/subscription/SubscriptionStatusCard';
import { useSubscription } from '../hooks/useSubscription';

export function SubscriptionSection() {
  const s = useSubscription();

  function renderBody() {
    if (s.status === 'error') return <ErrorState message={s.error ?? ''} onRetry={s.reload} />;
    if (!s.subscription || !s.catalogue || !s.subscriptionStatus || !s.graceEnds) {
      return <LoadingState label="Loading your subscription" rows={2} rowClassName="h-48" />;
    }
    if (!s.currentPlan) {
      return <ErrorState title="Plan not found" message="We couldn’t match your subscription to a plan. Please contact support." />;
    }
    return (
      <div className="space-y-8">
        <ExpiryBanner
          status={s.subscriptionStatus}
          daysLeft={s.daysLeft}
          renewsOn={s.subscription.renewsOn}
          graceEndsAt={s.graceEnds}
          onRenew={s.requestRenew} />

        <div className="grid gap-4 md:grid-cols-[minmax(0,28rem)_1fr] md:items-start">
          <SubscriptionStatusCard
            plan={s.currentPlan}
            subscription={s.subscription}
            status={s.subscriptionStatus}
            daysLeft={s.daysLeft}
            scheduledPlan={s.scheduledPlan}
            onRenew={s.requestRenew} />

          <div className="space-y-4">
            <Link to={DASHBOARD_ROUTES.billing} className={buttonClasses({ variant: 'secondary' })}>
              <ReceiptTextIcon className="h-4 w-4" aria-hidden="true" />
              Billing history & receipts
            </Link>
            <SubscriptionDemoControls busy={s.simulating} onSimulate={(state) => void s.simulate(state)} />
          </div>
        </div>
        <PlanComparison
          catalogue={s.catalogue}
          currentPlanId={s.subscription.planId}
          lapsed={s.subscriptionStatus === SUBSCRIPTION_STATUS.Expired}
          onChoose={s.requestSwitch} />

      </div>);

  }

  return (
    <>
      <PageHeader title="Subscription" subtitle="Your plan, renewal date and what each plan includes" />
      <PageContainer>{renderBody()}</PageContainer>
      <PlanActionDialog action={s.pending} loading={s.saving} onConfirm={() => void s.confirm()} onCancel={s.cancel} />
    </>);

}
