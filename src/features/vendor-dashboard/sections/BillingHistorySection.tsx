import { ReceiptTextIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { DASHBOARD_ROUTES } from '../constants';
import { InvoiceTable } from '../components/subscription/InvoiceTable';
import { useBillingHistory } from '../hooks/useBillingHistory';

/** /pro/subscription/billing — every subscription invoice with its receipt. */
export function BillingHistorySection() {
  const { data, status, error, reload } = useBillingHistory();

  function renderBody() {
    if (status === 'error') return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data) return <LoadingState label="Loading billing history" rows={3} rowClassName="h-14" />;
    if (data.length === 0) return <EmptyState icon={ReceiptTextIcon} title="No invoices yet" description="Your subscription payments will show here." />;
    return <InvoiceTable invoices={data} />;
  }

  return (
    <>
      <PageHeader title="Billing history" subtitle="Subscription invoices and receipts" backTo={{ to: DASHBOARD_ROUTES.subscription, label: 'Subscription' }} />
      <PageContainer>{renderBody()}</PageContainer>
    </>);

}
