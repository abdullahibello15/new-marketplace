import { Link, useParams } from 'react-router-dom';
import { SearchXIcon, StoreIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { vendorProfilePath } from '../../public-profile/constants';
import { useVendorProfile } from '../../public-profile/hooks/useVendorProfile';
import { bookingBlockedReason } from '../../public-profile/utils/profileText';
import { JobRequestForm } from '../components/request/JobRequestForm';

/** /vendors/:vendorId/book — the job request form for service vendors. */
export function JobRequestSection() {
  const { vendorId = '' } = useParams();
  const { profile, notFound, status, error, reload } = useVendorProfile(vendorId);
  const back = { to: vendorProfilePath(vendorId), label: profile?.vendor.name ?? 'Vendor' };

  function renderBody() {
    if (status === 'error') return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (notFound) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title="We couldn’t find that vendor"
          action={
          <Link to="/search" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Browse vendors
            </Link>
          } />);


    }
    if (!profile) return <LoadingState label="Loading" rows={3} rowClassName="h-40" />;

    const { vendor, kind } = profile;
    // Product sellers use the simpler Request dialog on their profile; jobs are for service vendors.
    const blocked = kind === 'retail' ? `${vendor.name} sells products, so there’s no job to book.` : bookingBlockedReason(vendor, kind, true);
    if (blocked) {
      return (
        <EmptyState
          icon={StoreIcon}
          title="You can’t book a job here right now"
          description={blocked}
          action={
          <Link to={vendorProfilePath(vendor.id)} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Back to {vendor.name}
            </Link>
          } />);


    }
    return <JobRequestForm vendor={vendor} />;
  }

  return (
    <>
      <PageHeader title="Request a job" subtitle={profile?.vendor.name} backTo={back} />
      <PageContainer width="narrow">{renderBody()}</PageContainer>
    </>);

}
