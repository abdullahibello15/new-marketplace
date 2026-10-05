import { Link } from 'react-router-dom';
import { XIcon } from 'lucide-react';
import { TradeBadge } from '../../../../components/TradeBadge';
import { buttonClasses } from '../../../../components/ui/buttonStyles';
import { vendorProfilePath } from '../../../public-profile/constants';
import { ListingPrice } from '../listings/ListingPrice';
import { VendorRating } from '../listings/VendorRating';
import type { VendorListing } from '../../types';

interface MapPreviewCardProps {
  listing: VendorListing;
  onClose: () => void;
}

/** Floats over the map for the selected marker: bottom of the screen on phones, bottom-left on desktop. */
export function MapPreviewCard({ listing: v, onClose }: MapPreviewCardProps) {
  return (
    <section
      aria-label={`Selected vendor: ${v.name}`}
      aria-live="polite"
      className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[1000] rounded-2xl border border-line bg-white p-3 shadow-xl lg:inset-x-auto lg:bottom-4 lg:left-4 lg:w-80">

      <div className="flex gap-3">
        <img src={v.photo} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-sand object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-bold leading-snug text-ink">{v.name}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-sand hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

              <XIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-1">
            <TradeBadge trade={v} />
          </div>
          <div className="mt-1">
            <VendorRating rating={v.rating} reviews={v.reviews} />
          </div>
          <ListingPrice listing={v} />
        </div>
      </div>
      <Link to={vendorProfilePath(v.id)} className={`${buttonClasses({ size: 'sm', fullWidth: true })} mt-3`}>
        View profile
      </Link>
    </section>);

}
