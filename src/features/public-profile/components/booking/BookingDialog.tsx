import { Dialog } from '../../../../components/ui/Dialog';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { BookingDialogContent } from './BookingDialogContent';
import type { CategoryKind, Vendor } from '../../../../types/marketplace';
import type { BookableItem } from '../../types';

interface BookingDialogProps {
  open: boolean;
  onClose: () => void;
  vendor: Vendor;
  kind: CategoryKind;
  label: string;
  items: BookableItem[];
}

/** Bottom sheet on phones, centred dialog on desktop. */
export function BookingDialog({ open, onClose, vendor, kind, label, items }: BookingDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${label}: ${vendor.name}`}
      description="Tell them what you need and when. The full booking flow is coming soon."
      variant={isDesktop ? 'center' : 'sheet'}>

      <BookingDialogContent vendor={vendor} kind={kind} items={items} onClose={onClose} />
    </Dialog>);

}
