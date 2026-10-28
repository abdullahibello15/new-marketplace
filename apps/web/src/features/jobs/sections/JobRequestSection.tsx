import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('jobs');
  const { vendorId = '' } = useParams();
  const { profile, notFound, status, error, reload } = useVendorProfile(vendorId);
  const back = { to: vendorProfilePath(vendorId), label: profile?.vendor.name ?? t('request.vendor') };

  function renderBody() {
    if (status === 'error') return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (notFound) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title={t('request.notFound')}
          action={
          <Link to="/search" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              {t('request.browse')}
            </Link>
          } />);


    }
    if (!profile) return <LoadingState label={t('request.loading')} rows={3} rowClassName="h-40" />;

    const { vendor, kind } = profile;
    // Product sellers use the simpler Request dialog on their profile; jobs are for service vendors.
    const blocked = kind === 'retail' ? t('request.sellsProducts', { name: vendor.name }) : bookingBlockedReason(vendor, kind, true);
    if (blocked) {
      return (
        <EmptyState
          icon={StoreIcon}
          title={t('request.blockedTitle')}
          description={blocked}
          action={
          <Link to={vendorProfilePath(vendor.id)} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              {t('request.backTo', { name: vendor.name })}
            </Link>
          } />);


    }
    return <JobRequestForm vendor={vendor} />;
  }

  return (
    <>
      <PageHeader title={t('request.pageTitle')} subtitle={profile?.vendor.name} backTo={back} />
      <PageContainer width="narrow">{renderBody()}</PageContainer>
    </>);

}
