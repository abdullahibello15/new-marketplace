import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { DownloadIcon, PrinterIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { PAYMENT_SUBJECT } from '../../payments/constants';
import { DASHBOARD_ROUTES, INVOICE_STATUS } from '../constants';
import { InvoiceReceipt } from '../components/subscription/InvoiceReceipt';
import { useInvoice } from '../hooks/useBillingHistory';
import { findAssociation } from '../services/associationService';
import { downloadInvoiceReceipt } from '../utils/invoiceReceipt';
import { useCurrentVendor } from '../../auth/hooks/useCurrentVendor';


/** /pro/subscription/billing/:invoiceId — one invoice's receipt, with Print and Download. */
export function InvoiceReceiptSection() {
  const { t } = useTranslation('vendor');
  const BACK = { to: DASHBOARD_ROUTES.billing, label: t('subscription.billingTitle') };
  const { invoiceId = '' } = useParams();
  const { data, status, error, reload } = useInvoice(invoiceId);
  const ownName = useCurrentVendor().businessName;
  // Bundle invoices are billed to the association, and belong to its admin screen.
  const vendorName = data?.associationId ? findAssociation(data.associationId).name : ownName;
  const home = data?.associationId ? { to: DASHBOARD_ROUTES.association, label: t('association.title') } : { to: DASHBOARD_ROUTES.subscription, label: t('subscription.title') };

  return (
    <>
      <div className="print:hidden">
        <PageHeader title={t('subscription.receiptTitle')} subtitle={data ? t('subscription.receipt.invoiceTitle', { id: data.id }) : undefined} backTo={data?.associationId ? { to: home.to, label: home.label } : BACK} />
      </div>
      <PageContainer width="narrow" className="space-y-4">
        {status === 'error' && <ErrorState message={error ?? ''} onRetry={reload} />}
        {!data && status === 'loading' && <LoadingState label={t('subscription.receiptLoading')} rows={1} rowClassName="h-80" />}
        {data &&
        <>
            <InvoiceReceipt invoice={data} vendorName={vendorName} />
            <div className="flex flex-col gap-2 sm:flex-row print:hidden">
              {data.status === INVOICE_STATUS.Open ?
            <Link to={DASHBOARD_ROUTES.pay(PAYMENT_SUBJECT.Subscription, data.id)} className={buttonClasses({})}>
                  {t('subscription.payInvoice')}
                </Link> :

            <>
                  <Button variant="outline" icon={PrinterIcon} onClick={() => window.print()}>
                    {t('subscription.print')}
                  </Button>
                  <Button variant="outline" icon={DownloadIcon} onClick={() => downloadInvoiceReceipt(data, vendorName)}>
                    {t('common:action.download')}
                  </Button>
                </>
            }
              <Link to={home.to} className={`${buttonClasses({ variant: 'secondary' })} sm:ml-auto`}>
                {t('subscription.backTo', { label: home.label })}
              </Link>
            </div>
          </>
        }
      </PageContainer>
    </>);

}
