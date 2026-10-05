import React from 'react';
import { Link } from 'react-router-dom';
import { StarIcon } from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { TradeBadge } from './TradeBadge';
import type { Vendor } from '../types/marketplace';

export function VendorCard({ vendor }: {vendor: Vendor;}) {
  return (
    <Link
      to={`/vendor/${vendor.id}`}
      className="flex h-full gap-4 rounded-2xl border border-line bg-white p-4 transition-[border-color,transform] duration-150 ease-out hover:border-pine/40 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
      
      <img
        src={vendor.photo}
        alt=""
        className="h-16 w-16 shrink-0 rounded-xl object-cover lg:h-[72px] lg:w-[72px]" />
      
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate text-base font-bold text-ink">{vendor.name}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-sm text-muted">
          <StarIcon className="h-4 w-4 fill-mustard text-mustard" aria-hidden="true" />
          <span className="font-semibold text-ink">{vendor.rating}</span>
          <span aria-hidden="true">·</span>
          <span>{vendor.distanceKm}km</span>
          <span aria-hidden="true">·</span>
          <span>{vendor.tagline}</span>
        </p>
        <div className="mt-auto flex min-w-0 flex-wrap gap-1.5 pt-2.5">
          <TradeBadge trade={vendor} />
          <VerificationBadge verification={vendor.verification} />
        </div>
      </div>
    </Link>);

}