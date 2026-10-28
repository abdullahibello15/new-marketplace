import { useTranslation } from 'react-i18next';
import { ImageOffIcon } from 'lucide-react';
import { PortfolioGrid } from '../../../components/PortfolioGrid';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PROFILE_SECTION_ID } from '../constants';
import { PageSection } from './PageSection';
import type { Vendor } from '../../../types/marketplace';

/** Work photos in the shared grid + lightbox (keyboard arrows, Escape, swipe), or a placeholder. */
export function PortfolioSection({ vendor }: {vendor: Vendor;}) {
  const { t } = useTranslation('discovery');
  const id = PROFILE_SECTION_ID.Portfolio;
  return (
    <PageSection id={id} title={vendor.gallery.length ? t('profile.portfolioCount', { count: vendor.gallery.length }) : t('profile.portfolio')}>
      {vendor.gallery.length > 0 ?
      <PortfolioGrid photos={vendor.gallery} vendorName={vendor.name} labelledBy={`${id}-heading`} /> :

      <EmptyState icon={ImageOffIcon} title={t('profile.noPhotosTitle')} description={t('profile.noPhotosText', { name: vendor.name })} />
      }
    </PageSection>);

}
