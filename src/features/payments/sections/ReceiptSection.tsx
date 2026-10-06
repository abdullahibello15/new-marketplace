import { Link, useParams } from 'react-router-dom';
import { DownloadIcon, PrinterIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { ReceiptView } from '../components/receipt/ReceiptView';
import { useReceipt } from '../hooks/useReceipt';
import { downloadReceipt } from '../utils/receipt';
import { subjectPath } from '../utils/subject';

/** Receipt after a payment goes through: reference number, details, and Print / Download. */
export function ReceiptSection() {
  const { reference = '' } = useParams();
  const { data, status, error, reload } = useReceipt(reference);
  const back = data ? { to: subjectPath(data.payment.subject), label: data.payment.description } : undefined;

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Receipt" subtitle={data ? `Thank you, ${data.payment.customerName.split(' ')[0]}.` : undefined} backTo={back} />
      </div>
      <PageContainer width="narrow" className="space-y-4">
        {status === 'error' && <ErrorState title="No receipt yet" message={error ?? ''} onRetry={reload} />}
        {!data && status === 'loading' && <LoadingState label="Loading receipt" rows={1} rowClassName="h-80" />}
        {data &&
        <>
            <ReceiptView receipt={data} />
            <div className="flex flex-col gap-2 sm:flex-row print:hidden">
              <Button variant="outline" icon={PrinterIcon} onClick={() => window.print()}>
                Print
              </Button>
              <Button variant="outline" icon={DownloadIcon} onClick={() => downloadReceipt(data)}>
                Download
              </Button>
              <Link to={subjectPath(data.payment.subject)} className={`${buttonClasses({ variant: 'secondary' })} sm:ml-auto`}>
                Back to {data.payment.description.split(' · ')[0]}
              </Link>
            </div>
          </>
        }
      </PageContainer>
    </>);

}
