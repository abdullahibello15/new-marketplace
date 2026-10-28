import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ReceiptTextIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { DASHBOARD_ROUTES, SUBSCRIPTION_STATUS } from '../constants';
import { PlanActionDialog } from '../components/subscription/PlanActionDialog';
import { PlanComparison } from '../components/subscription/PlanComparison';
import { SubscriptionDemoControls } from '../components/subscription/SubscriptionDemoControls';
import { SubscriptionRemindersList } from '../components/subscription/SubscriptionRemindersList';
import { SubscriptionStatusCard } from '../components/subscription/SubscriptionStatusCard';
import { useSubscription } from '../hooks/useSubscription';

export function SubscriptionSection() {
  const { t } = useTranslation('vendor');
  const s = useSubscription();

  function renderBody() {
    if (s.status === 'error') return <ErrorState message={s.error ?? ''} onRetry={s.reload} />;
    if (!s.subscription || !s.catalogue || !s.subscriptionStatus || !s.graceEnds) {
      return <LoadingState label={t('subscription.loading')} rows={2} rowClassName="h-48" />;
    }
    if (!s.currentPlan) {
      return <ErrorState title={t('subscription.planNotFound')} message={t('subscription.planNotFoundText')} />;
    }
    return (
      <div className="space-y-8">
        {/* The expiry / grace / suspended banner is shown by the vendor shell on every dashboard page. */}
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
              {t('subscription.billingLink')}
            </Link>
            {s.reminderKey && <SubscriptionRemindersList reminderKey={s.reminderKey} refreshKey={s.subscription.renewsOn} />}
            {!s.coveredBy && <SubscriptionDemoControls busy={s.simulating} onSimulate={(state) => void s.simulate(state)} />}
          </div>
        </div>
        <PlanComparison
          catalogue={s.catalogue}
          currentPlanId={s.subscription.planId}
          lapsed={s.subscriptionStatus === SUBSCRIPTION_STATUS.Suspended}
          covered={s.coveredBy !== null}
          onChoose={s.requestSwitch} />

      </div>);

  }

  return (
    <>
      <PageHeader title={t('subscription.title')} subtitle={t('subscription.subtitle')} />
      <PageContainer>{renderBody()}</PageContainer>
      <PlanActionDialog action={s.pending} loading={s.saving} onConfirm={() => void s.confirm()} onCancel={s.cancel} />
    </>);

}
