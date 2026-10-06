import { useParams } from 'react-router-dom';
import { SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { PaymentCheckout } from '../components/PaymentCheckout';
import { isSubjectKind } from '../utils/subject';

/** /pay/:kind/:id — validates the URL, then shows the payment screen. */
export function PaymentCheckoutSection() {
  const { kind, id = '' } = useParams();
  if (!isSubjectKind(kind)) {
    return (
      <>
        <PageHeader title="Payment" />
        <PageContainer width="narrow">
          <EmptyState icon={SearchXIcon} title="We couldn’t find that payment page" />
        </PageContainer>
      </>);

  }
  return <PaymentCheckout kind={kind} id={id} />;
}
