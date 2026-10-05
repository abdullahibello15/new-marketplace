import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { OpenStatusBadge } from '../../../../components/OpenStatusBadge';
import { TradeBadge } from '../../../../components/TradeBadge';
import { StarRating } from '../../../../components/ui/StarRating';
import { PROFILE_SECTION_ID } from '../../constants';
import { ResponseTimeIndicator } from './ResponseTimeIndicator';
import { VerificationBadgeInfo } from './VerificationBadgeInfo';
import type { Vendor } from '../../../../types/marketplace';

interface ProfileHeaderProps {
  vendor: Vendor;
  /** The Book/Request button. Shown here on desktop; phones get a sticky bar instead. */
  bookAction: React.ReactNode;
}

export function ProfileHeader({ vendor, bookAction }: ProfileHeaderProps) {
  return (
    <header className="bg-pine text-white">
      <div className="mx-auto max-w-6xl px-5 pb-6 pt-6 lg:px-10 lg:pb-9 lg:pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-white/80 transition-colors duration-150 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">

          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Home
        </Link>

        <div className="mt-4 flex items-start gap-4 lg:gap-6">
          <img src={vendor.photo} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-pine-deep object-cover ring-2 ring-white/20 lg:h-28 lg:w-28" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight lg:text-[32px]">{vendor.name}</h1>
              <VerificationBadgeInfo verification={vendor.verification} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TradeBadge trade={vendor} />
              <OpenStatusBadge hours={vendor.workingHours} />
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/90">
              <a
                href={`#${PROFILE_SECTION_ID.Reviews}`}
                className="inline-flex items-center gap-1.5 rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">

                {vendor.reviews > 0 ?
                <>
                    <StarRating value={vendor.rating} />
                    <span className="font-bold text-white">{vendor.rating.toFixed(1)}</span>
                    <span>
                      ({vendor.reviews.toLocaleString('en-NG')} {vendor.reviews === 1 ? 'review' : 'reviews'})
                    </span>
                  </> :

                'No reviews yet'
                }
              </a>
              <ResponseTimeIndicator minutes={vendor.responseTimeMinutes} />
            </div>
          </div>

          <div className="hidden w-56 shrink-0 lg:block">{bookAction}</div>
        </div>
      </div>
    </header>);

}
