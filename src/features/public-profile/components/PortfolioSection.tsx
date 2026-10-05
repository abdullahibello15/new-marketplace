import { ImageOffIcon } from 'lucide-react';
import { PortfolioGrid } from '../../../components/PortfolioGrid';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PROFILE_SECTION_ID } from '../constants';
import { PageSection } from './PageSection';
import type { Vendor } from '../../../types/marketplace';

/** Work photos in the shared grid + lightbox (keyboard arrows, Escape, swipe), or a placeholder. */
export function PortfolioSection({ vendor }: {vendor: Vendor;}) {
  const id = PROFILE_SECTION_ID.Portfolio;
  return (
    <PageSection id={id} title={vendor.gallery.length ? `Portfolio · ${vendor.gallery.length}` : 'Portfolio'}>
      {vendor.gallery.length > 0 ?
      <PortfolioGrid photos={vendor.gallery} vendorName={vendor.name} labelledBy={`${id}-heading`} /> :

      <EmptyState icon={ImageOffIcon} title="No work photos yet" description={`${vendor.name} hasn’t added photos of their work.`} />
      }
    </PageSection>);

}
