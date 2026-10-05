import { StarIcon } from 'lucide-react';
import type { VendorListing } from '../../types';

/** "★ 4.8 (62)", or "New · no reviews yet" for vendors nobody has reviewed. */
export function VendorRating({ rating, reviews }: Pick<VendorListing, 'rating' | 'reviews'>) {
  if (reviews === 0) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted">
        <span className="rounded bg-[#E3EEEC] px-1.5 text-xs font-bold leading-5 text-pine">New</span>
        No reviews yet
      </p>);

  }
  return (
    <p className="flex items-center gap-1 text-sm text-muted">
      <StarIcon className="h-4 w-4 fill-mustard text-mustard" aria-hidden="true" />
      <span className="sr-only">Rated</span>
      <span className="font-semibold text-ink">{rating.toFixed(1)}</span>
      <span className="sr-only">out of 5 from</span>
      <span>
        ({reviews.toLocaleString('en-NG')}
        <span className="sr-only"> {reviews === 1 ? 'review' : 'reviews'}</span>)
      </span>
    </p>);

}
