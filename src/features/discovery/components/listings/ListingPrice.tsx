import { PriceRange } from '../../../../components/ui/PriceRange';
import type { VendorListing } from '../../types';

/** A vendor's overall price range, shared by the list card and the map preview. */
export function ListingPrice({ listing }: {listing: Pick<VendorListing, 'priceFrom' | 'priceTo'>;}) {
  return (
    <p className="mt-0.5 text-sm font-semibold text-ink">
      {listing.priceFrom !== null && listing.priceTo !== null ?
      <PriceRange min={listing.priceFrom} max={listing.priceTo} /> :
      'Prices on request'}
    </p>);

}
