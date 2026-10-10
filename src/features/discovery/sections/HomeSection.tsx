import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { PageHeader } from '../../../components/PageHeader';
import { PageContainer } from '../../../components/ui/PageContainer';
import { useAuth } from '../../auth/hooks/useAuth';
import { CategoryGrid } from '../components/categories/CategoryGrid';
import { NearbyVendorFeed } from '../components/feed/NearbyVendorFeed';
import { PlaceChip } from '../components/location/PlaceChip';
import { SearchBar } from '../components/search/SearchBar';

/** Customer home: location and search up top, then categories and the near-you feed. */
export function HomeSection() {
  const { t } = useTranslation('discovery');
  const { user } = useAuth();
  const firstName = user?.name.split(' ')[0];
  return (
    <>
      <PageHeader title={firstName ? t('home.greeting', { name: firstName }) : t('home.titleSignedOut')}>
        <div className="space-y-3 lg:max-w-xl">
          <PlaceChip />
          <SearchBar />
          {!user && <LanguageSelector tone="dark" className="max-w-[12rem]" />}
        </div>
      </PageHeader>
      <PageContainer className="space-y-8 lg:space-y-10">
        <CategoryGrid />
        <NearbyVendorFeed />
      </PageContainer>
    </>);

}
