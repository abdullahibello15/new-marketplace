import { Link } from 'react-router-dom';
import { MapPinIcon } from 'lucide-react';
import { TradeBadge } from '../../../../components/TradeBadge';
import { VerificationBadge } from '../../../../components/VerificationBadge';
import { formatDistance } from '../../../../lib/geo';
import { vendorProfilePath } from '../../../public-profile/constants';
import { ListingPrice } from './ListingPrice';
import { VendorRating } from './VendorRating';
import type { VendorListing } from '../../types';

const AREAS_SHOWN = 2;

function areasText(areas: string[]): string {
  if (areas.length === 0) return 'Area not set';
  const extra = areas.length - AREAS_SHOWN;
  return `Serves ${areas.slice(0, AREAS_SHOWN).join(', ')}${extra > 0 ? ` +${extra} more` : ''}`;
}

interface VendorListingCardProps {
  listing: VendorListing;
  /** Ring highlight, e.g. while its marker is selected on the map. */
  highlighted?: boolean;
}

export function VendorListingCard({ listing: v, highlighted = false }: VendorListingCardProps) {
  return (
    <Link
      to={vendorProfilePath(v.id)}
      className={`flex h-full gap-4 rounded-2xl border bg-white p-4 transition-[border-color,box-shadow,transform] duration-150 ease-out hover:border-pine/40 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
      highlighted ? 'border-pine ring-2 ring-pine' : 'border-line'}`}>

      <img src={v.photo} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl bg-sand object-cover" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink">{v.name}</h3>
          {v.distanceKm !== null &&
          <span className="shrink-0 whitespace-nowrap pt-0.5 text-xs font-semibold text-muted">{formatDistance(v.distanceKm)}</span>
          }
        </div>

        <div className="mt-0.5">
          <VendorRating rating={v.rating} reviews={v.reviews} />
        </div>

        <ListingPrice listing={v} />

        <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{areasText(v.serviceAreas)}</span>
        </p>

        <div className="mt-auto flex min-w-0 flex-wrap gap-1.5 pt-2.5">
          <TradeBadge trade={v} />
          <VerificationBadge verification={v.verification} />
        </div>
      </div>
    </Link>);

}
