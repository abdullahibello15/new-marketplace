import { PageHeader } from '../../../components/PageHeader';
import { PageContainer } from '../../../components/ui/PageContainer';
import { user } from '../../../data/user';
import { CategoryGrid } from '../components/categories/CategoryGrid';
import { NearbyVendorFeed } from '../components/feed/NearbyVendorFeed';
import { PlaceChip } from '../components/location/PlaceChip';
import { SearchBar } from '../components/search/SearchBar';

/** Customer home: location and search up top, then categories and the near-you feed. */
export function HomeSection() {
  return (
    <>
      <PageHeader title={`Hi, ${user.firstName} 👋`}>
        <div className="space-y-3 lg:max-w-xl">
          <PlaceChip />
          <SearchBar />
        </div>
      </PageHeader>
      <PageContainer className="space-y-8 lg:space-y-10">
        <CategoryGrid />
        <NearbyVendorFeed />
      </PageContainer>
    </>);

}
