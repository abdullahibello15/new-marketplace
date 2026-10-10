import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { DownloadIcon, ListIcon, PrinterIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { DASHBOARD_ROUTES } from '../../vendor-dashboard/constants';
import { PAYMENT_ROUTES } from '../constants';
import { ReceiptView } from '../components/receipt/ReceiptView';
import { useReceipt } from '../hooks/useReceipt';
import { useReceiptDownload } from '../hooks/useReceiptDownload';
import { subjectPath } from '../utils/subject';
import type { ReceiptViewer } from '../types';

/**
 * A payment's receipt (or refund note): where the customer lands after paying, and the vendor's copy
 * (same receipt, with the commission breakdown). Print, or download it as a PDF.
 */
export function ReceiptSection({ viewer = 'customer' }: {viewer?: ReceiptViewer;}) {
  const { t } = useTranslation('payments');
  const { reference = '' } = useParams();
  const { data, status, error, reload } = useReceipt(reference, viewer);
  const download = useReceiptDownload();
  const vendor = viewer === 'vendor';
  const back = vendor ?
  { to: DASHBOARD_ROUTES.earnings, label: t('receipt.earningsLink') } :
  data ? { to: subjectPath(data.subject), label: data.description } : undefined;

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={data?.kind === 'refund_note' ? t('receipt.titleRefund') : t('receipt.receipt')}
          subtitle={data && !vendor ? t('receipt.thanks', { name: data.customerName.split(' ')[0] }) : data ? `${data.customerName} · ${data.description}` : undefined}
          backTo={back} />

      </div>
      <PageContainer width="narrow" className="space-y-4">
        {status === 'error' && <ErrorState title={t('receipt.noReceipt')} message={error ?? ''} onRetry={reload} />}
        {!data && status === 'loading' && <LoadingState label={t('receipt.loading')} rows={1} rowClassName="h-80" />}
        {data &&
        <>
            <ReceiptView receipt={data} />
            <div className="flex flex-col gap-2 sm:flex-row print:hidden">
              <Button icon={DownloadIcon} onClick={() => void download.downloadDocument(data)} loading={download.busy === data.reference}>
                {t('receipt.downloadPdf')}
              </Button>
              <Button variant="outline" icon={PrinterIcon} onClick={() => window.print()}>
                {t('receipt.print')}
              </Button>
              {vendor ?
            <Link to={DASHBOARD_ROUTES.earnings} className={`${buttonClasses({ variant: 'secondary' })} sm:ml-auto`}>
                  {t('receipt.backToEarnings')}
                </Link> :

            <Link to={PAYMENT_ROUTES.transaction(data.reference)} className={`${buttonClasses({ variant: 'secondary' })} sm:ml-auto`}>
                  <ListIcon className="h-4 w-4" aria-hidden="true" />
                  {t('receipt.details')}
                </Link>
            }
            </div>
          </>
        }
      </PageContainer>
    </>);

}
