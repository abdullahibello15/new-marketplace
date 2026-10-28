import { PageHeader } from '../../../components/PageHeader';
import { ErrorState } from '../../../components/ui/ErrorState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { getOutreachQueues } from '../services/analyticsService';
import { AnalyticsSkeleton, ChartCard } from '../components/analytics/AnalyticsParts';
import { ChurnAtRiskList, SlaAtRiskList } from '../components/analytics/AtRiskLists';
import { CHURN } from '../analytics/config';

/**
 * /admin/outreach — the at-risk vendor lists from the response-time and churn dashboards, for Support
 * (who can't see the rest of analytics). Same lists, same actions, same audit trail.
 */
export function OutreachSection() {
  const { data, status, error, reload } = useAsyncData(getOutreachQueues);

  function renderBody() {
    if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data) return <AnalyticsSkeleton />;
    const periodText = `the last ${data.slaWindowDays} days`;
    return (
      <div className="space-y-4" aria-busy={status === 'loading'}>
        <ChartCard
          title={`Slow to respond: ${data.sla.length} vendor${data.sla.length === 1 ? '' : 's'}`}
          info={`Vendors with ${data.repeatBreachThreshold} or more response-time breaches in ${periodText}. A reminder goes to the vendor as a notification; a flag is internal. Both are written to the audit log.`}
          empty={data.sla.length === 0}
          emptyText={`No vendor breached repeatedly in ${periodText}.`}>

          <SlaAtRiskList rows={data.sla} periodText={periodText} />
        </ChartCard>
        <ChartCard
          title={`At risk of churning: ${data.churn.length} vendor${data.churn.length === 1 ? '' : 's'}`}
          info={`Vendors in the grace period, with completed work down by half or more over the last ${CHURN.risk.activityWindowDays} days, or with a declining rating. A message goes to the vendor as a notification; a flag is internal. Both are written to the audit log.`}
          empty={data.churn.length === 0}
          emptyText="No vendors show signs of churning right now.">

          <ChurnAtRiskList rows={data.churn} />
        </ChartCard>
      </div>);

  }

  return (
    <>
      <PageHeader title="Vendor outreach" subtitle="Vendors who are slow to respond or likely to leave. Nudge them, or flag them for a call." />
      <PageContainer className="space-y-4">{renderBody()}</PageContainer>
    </>);

}
