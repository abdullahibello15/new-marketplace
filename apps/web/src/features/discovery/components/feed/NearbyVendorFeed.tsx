import { useTranslation } from 'react-i18next';
import { MapPinIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { placeLabel } from '../../constants';
import { usePlace } from '../../hooks/usePlace';
import { useVendorFeed } from '../../hooks/useVendorFeed';
import { VendorListingResults } from '../listings/VendorListingResults';

export function NearbyVendorFeed() {
  const { place, openPicker } = usePlace();
  const { t } = useTranslation('discovery');
  const feed = useVendorFeed();

  return (
    <section aria-labelledby="feed-heading">
      <h2 id="feed-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
        {t('home.nearYou', { place: place.name })}
      </h2>
      <div className="mt-3">
        <VendorListingResults
          items={feed.items}
          total={feed.total}
          status={feed.status}
          error={feed.error}
          hasMore={feed.hasMore}
          onLoadMore={feed.loadMore}
          onRetry={feed.retry}
          emptyTitle={t('results.emptyAreaTitle')}
          emptyDescription={t('results.emptyAreaText', { place: placeLabel(place) })}
          emptyAction={
          <Button variant="secondary" size="sm" icon={MapPinIcon} onClick={openPicker}>
              {t('place.change')}
            </Button>
          } />

      </div>
    </section>);

}
