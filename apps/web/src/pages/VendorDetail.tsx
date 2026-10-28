import { Link, useParams } from 'react-router-dom';
import { MapPinIcon, MapPinnedIcon, StarIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { VerificationBadge } from '../components/VerificationBadge';
import { TradeBadge } from '../components/TradeBadge';
import { OpenStatusBadge } from '../components/OpenStatusBadge';
import { StatTile } from '../components/StatTile';
import { PortfolioGrid } from '../components/PortfolioGrid';
import { ServicePriceList } from '../components/ServicePriceList';
import { ProductGrid } from '../components/ProductGrid';
import { WorkingHoursCard } from '../components/WorkingHoursCard';
import { NotFound } from './NotFound';
import { useVendors } from '../contexts/VendorsContext';
import { formatTrade } from '../utils/format';

export function VendorDetail() {
  const { vendorId } = useParams();
  const { getVendor } = useVendors();
  const vendor = vendorId ? getVendor(vendorId) : undefined;

  if (!vendor) return <NotFound message="We couldn't find that vendor." />;

  return (
    <>
      <PageHeader
        title={vendor.name}
        subtitle={`${formatTrade(vendor)} · ${vendor.lga}`}
        backTo={{ to: '/', label: 'Home' }}>

        {vendor.bio &&
        <p className="mb-3 max-w-2xl text-[15px] leading-relaxed text-white/90">{vendor.bio}</p>
        }
        <div className="flex flex-wrap items-center gap-2">
          <TradeBadge trade={vendor} />
          <OpenStatusBadge hours={vendor.workingHours} />
          <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-xs font-bold">
            <StarIcon className="h-3.5 w-3.5 fill-mustard text-mustard" aria-hidden="true" />
            {vendor.rating} · {vendor.reviews} reviews
          </span>
          <VerificationBadge verification={vendor.verification} />
        </div>
      </PageHeader>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 lg:px-10 lg:py-8">
        <div className="space-y-5">
          <PortfolioGrid photos={vendor.gallery} vendorName={vendor.name} />

          <section className="rounded-2xl border border-line bg-white p-4 lg:p-5" aria-labelledby="about-heading">
            <h2 id="about-heading" className="sr-only">About</h2>
            <p className="text-[15px] leading-relaxed text-muted">
              <strong className="font-bold text-ink">{vendor.yearsExperience} years</strong> experience · {vendor.about}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              <MapPinIcon className="h-4 w-4" aria-hidden="true" />
              {vendor.distanceKm}km from you
            </p>
            {vendor.serviceAreas.length > 0 &&
            <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted">
                <MapPinnedIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-ink">Serves:</span> {vendor.serviceAreas.join(', ')}
                </span>
              </p>
            }
          </section>

          <ServicePriceList services={vendor.services} />

          <ProductGrid products={vendor.products} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <div>
            <div className="grid grid-cols-2 gap-3">
              <StatTile value={vendor.priceRange} label="Price range" />
              <StatTile value={vendor.responseTime} label="Response time" />
            </div>
            <Link
              to={`/vendor/${vendor.id}/request`}
              className="mt-5 flex w-full items-center justify-center rounded-xl bg-clay px-5 py-3.5 text-base font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-clay-dark active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-cream">

              Send job request
            </Link>
            <p className="mt-3 text-center text-sm text-muted">You'll get a fixed quote before anything is booked.</p>
          </div>
          <WorkingHoursCard hours={vendor.workingHours} />
        </aside>
      </div>
    </>);

}
