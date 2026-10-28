import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SEARCH_ROUTE } from '../../discovery/constants';
import { JOB_ROUTES } from '../../jobs/constants';
import { AboutSection } from '../components/AboutSection';
import { BookButton } from '../components/booking/BookButton';
import { BookingDialog } from '../components/booking/BookingDialog';
import { MobileBookingBar } from '../components/booking/MobileBookingBar';
import { ProfileHeader } from '../components/header/ProfileHeader';
import { PortfolioSection } from '../components/PortfolioSection';
import { ProfileSkeleton } from '../components/ProfileSkeleton';
import { ReviewsSection } from '../components/reviews/ReviewsSection';
import { ServicesSection } from '../components/ServicesSection';
import { useVendorProfile } from '../hooks/useVendorProfile';
import { bookableItems } from '../utils/bookableItems';
import { bookingBlockedReason } from '../utils/profileText';

/** Customer-facing vendor profile at /vendors/:vendorId. */
export function VendorProfileSection() {
  const { t } = useTranslation('discovery');
  const HOME = { to: '/', label: t('profile.home') };
  const { vendorId = '' } = useParams();
  const { profile, notFound, status, error, reload } = useVendorProfile(vendorId);
  const [bookingOpen, setBookingOpen] = useState(false);
  const navigate = useNavigate();
  const items = useMemo(() => profile ? bookableItems(profile.vendor) : [], [profile]);

  if (status === 'error') {
    return (
      <>
        <PageHeader title={t('profile.title')} backTo={HOME} />
        <PageContainer width="narrow">
          <ErrorState message={error ?? ''} onRetry={reload} />
        </PageContainer>
      </>);

  }
  if (notFound) {
    return (
      <>
        <PageHeader title={t('profile.notFoundTitle')} backTo={HOME} />
        <PageContainer width="narrow">
          <EmptyState
            icon={SearchXIcon}
            title={t('profile.notFoundHeading')}
            description={t('profile.notFoundText')}
            action={
            <Link to={SEARCH_ROUTE} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                {t('profile.browse')}
              </Link>
            } />

        </PageContainer>
      </>);

  }
  if (!profile) return <ProfileSkeleton />;

  const { vendor, kind } = profile;
  const label = t(`profile.action.${kind}`);
  const blockedReason = bookingBlockedReason(vendor, kind, items.length > 0);
  // Service vendors get the full job request flow; retail vendors keep the quick Request dialog.
  const startBooking = () => kind === 'service' ? navigate(JOB_ROUTES.request(vendor.id)) : setBookingOpen(true);
  const fromPrice = items.length ? Math.min(...items.map((i) => i.minPrice)) : null;
  const book = (tone: 'onDark' | 'onLight') =>
  <BookButton kind={kind} label={label} blockedReason={blockedReason} onClick={startBooking} tone={tone} />;


  return (
    <>
      <ProfileHeader vendor={vendor} bookAction={book('onDark')} />

      {/* Extra bottom padding on phones so the sticky booking bar never covers the last review. */}
      <PageContainer className="space-y-10 pb-28 lg:pb-10">
        <AboutSection vendor={vendor} />
        <ServicesSection vendor={vendor} />
        <PortfolioSection vendor={vendor} />
        <ReviewsSection vendorId={vendor.id} vendorName={vendor.name} />
      </PageContainer>

      <MobileBookingBar fromPrice={fromPrice}>{book('onLight')}</MobileBookingBar>

      <BookingDialog open={bookingOpen} onClose={() => setBookingOpen(false)} vendor={vendor} kind={kind} label={label} items={items} />
    </>);

}
