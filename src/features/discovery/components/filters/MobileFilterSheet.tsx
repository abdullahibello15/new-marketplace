import { Dialog } from '../../../../components/ui/Dialog';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { MobileFilterSheetContent } from './MobileFilterSheetContent';
import type { SearchFilters } from '../../types';

interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApply: (next: SearchFilters) => void;
}

/**
 * Filters with an Apply button. A bottom sheet on phones; a centred dialog on desktop, where it is used
 * in map view (the filter column makes way for the map there). Nothing changes until Apply.
 */
export function MobileFilterSheet({ open, onClose, filters, onApply }: MobileFilterSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return (
    <Dialog open={open} onClose={onClose} title="Filters" variant={isDesktop ? 'center' : 'sheet'}>
      <MobileFilterSheetContent
        filters={filters}
        onApply={(next) => {
          onApply(next);
          onClose();
        }} />

    </Dialog>);

}
