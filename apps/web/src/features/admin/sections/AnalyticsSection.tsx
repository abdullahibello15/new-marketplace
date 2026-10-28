import { PageHeader } from '../../../components/PageHeader';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { AnalyticsControls } from '../components/analytics/AnalyticsControls';
import { ChurnPanel } from '../components/analytics/ChurnPanel';
import { GmvPanel } from '../components/analytics/GmvPanel';
import { QueuesPanel } from '../components/analytics/QueuesPanel';
import { SlaPanel } from '../components/analytics/SlaPanel';
import { SubscriptionsPanel } from '../components/analytics/SubscriptionsPanel';
import { VendorsPanel } from '../components/analytics/VendorsPanel';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import type { AnalyticsTab } from '../analytics/types';

const TABS: {id: AnalyticsTab;label: string;}[] = [
{ id: 'vendors', label: 'Active vendors' },
{ id: 'gmv', label: 'GMV' },
{ id: 'subscriptions', label: 'Subscription revenue' },
{ id: 'sla', label: 'Response times' },
{ id: 'churn', label: 'Vendor churn' },
{ id: 'queues', label: 'Admin queues' }];


/**
 * /admin/analytics — the platform dashboard (Analysts and Super admins only). One date range and "vs
 * previous period" apply to every section; everything is kept in the URL. All figures are calculated by
 * analyticsService from the platform's records through the aggregation, SLA and churn helpers.
 */
export function AnalyticsSection() {
  const { tab, query, sla, search, vendor, churn, update } = useAnalyticsQuery();
  return (
    <>
      <PageHeader title="Analytics" subtitle="Vendors, GMV, subscription revenue, response times and churn, calculated from the platform’s records" />
      <PageContainer className="space-y-4">
        <div className="overflow-x-auto">
          <SegmentedControl<AnalyticsTab> label="Section" options={TABS} value={tab} onChange={(t) => update({ tab: t })} />
        </div>
        {tab !== 'queues' && <AnalyticsControls query={query} onChange={update} />}
        {tab === 'vendors' && <VendorsPanel query={query} onKindChange={(kind) => update({ kind })} />}
        {tab === 'gmv' && <GmvPanel query={query} />}
        {tab === 'subscriptions' && <SubscriptionsPanel query={query} />}
        {tab === 'sla' && <SlaPanel query={query} filters={sla} search={search} vendor={vendor} onChange={update} />}
        {tab === 'churn' && <ChurnPanel query={query} type={churn} onTypeChange={(t) => update({ churn: t })} />}
        {tab === 'queues' && <QueuesPanel />}
      </PageContainer>
    </>);

}
