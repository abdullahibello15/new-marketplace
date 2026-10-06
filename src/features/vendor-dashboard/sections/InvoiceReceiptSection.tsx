import { Link, useParams } from 'react-router-dom';
import { DownloadIcon, PrinterIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { useVendors } from '../../../contexts/VendorsContext';
import { vendorAccount } from '../../../data/vendorPortal';
import { PAYMENT_SUBJECT } from '../../payments/constants';
import { DASHBOARD_ROUTES, INVOICE_STATUS } from '../constants';
import { InvoiceReceipt } from '../components/subscription/InvoiceReceipt';
import { useInvoice } from '../hooks/useBillingHistory';
import { downloadInvoiceReceipt } from '../utils/invoiceReceipt';

const BACK = { to: DASHBOARD_ROUTES.billing, label: 'Billing history' };

/** /pro/subscription/billing/:invoiceId — one invoice's receipt, with Print and Download. */
export function InvoiceReceiptSection() {
  const { invoiceId = '' } = useParams();
  const { data, status, error, reload } = useInvoice(invoiceId);
  const vendorName = useVendors().getVendor(vendorAccount.vendorId)?.name ?? vendorAccount.businessName;

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Receipt" subtitle={data ? `Invoice ${data.id}` : undefined} backTo={BACK} />
      </div>
      <PageContainer width="narrow" className="space-y-4">
        {status === 'error' && <ErrorState message={error ?? ''} onRetry={reload} />}
        {!data && status === 'loading' && <LoadingState label="Loading receipt" rows={1} rowClassName="h-80" />}
        {data &&
        <>
            <InvoiceReceipt invoice={data} vendorName={vendorName} />
            <div className="flex flex-col gap-2 sm:flex-row print:hidden">
              {data.status === INVOICE_STATUS.Open ?
            <Link to={DASHBOARD_ROUTES.pay(PAYMENT_SUBJECT.Subscription, data.id)} className={buttonClasses({})}>
                  Pay this invoice
                </Link> :

            <>
                  <Button variant="outline" icon={PrinterIcon} onClick={() => window.print()}>
                    Print
                  </Button>
                  <Button variant="outline" icon={DownloadIcon} onClick={() => downloadInvoiceReceipt(data, vendorName)}>
                    Download
                  </Button>
                </>
            }
              <Link to={DASHBOARD_ROUTES.subscription} className={`${buttonClasses({ variant: 'secondary' })} sm:ml-auto`}>
                Back to subscription
              </Link>
            </div>
          </>
        }
      </PageContainer>
    </>);

}
