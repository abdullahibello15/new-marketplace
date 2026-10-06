import { WrenchIcon } from 'lucide-react';
import { ProductGrid } from '../../../components/ProductGrid';
import { ServicePriceList } from '../../../components/ServicePriceList';
import { EmptyState } from '../../../components/ui/EmptyState';
import { AddToCartButton } from '../../orders/components/cart/AddToCartButton';
import { PROFILE_SECTION_ID } from '../constants';
import type { Vendor } from '../../../types/marketplace';

/** Services and prices (and products, for vendors who sell them, with Add to cart). Reuses the shared list and grid. */
export function ServicesSection({ vendor }: {vendor: Vendor;}) {
  const hasServices = vendor.services.length > 0;
  // Same rule ProductGrid uses for what customers can see.
  const hasProducts = vendor.products.some((p) => p.available && p.images.length > 0);

  return (
    <div id={PROFILE_SECTION_ID.Services} className="scroll-mt-6 space-y-8">
      {hasServices && <ServicePriceList services={vendor.services} />}
      {hasProducts && <ProductGrid products={vendor.products} renderAction={(p) => <AddToCartButton vendor={vendor} product={p} />} />}
      {!hasServices && !hasProducts &&
      <section aria-labelledby="services-empty-heading">
          <h2 id="services-empty-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
            Services & prices
          </h2>
          <div className="mt-3">
            <EmptyState icon={WrenchIcon} title="No services listed yet" description={`${vendor.name} hasn’t added their services and prices yet.`} />
          </div>
        </section>
      }
    </div>);

}
