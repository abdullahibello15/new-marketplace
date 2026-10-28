import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('discovery');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('booking.dialogTitle', { action: label, name: vendor.name })}
      description={t('booking.dialogText')}
      variant={isDesktop ? 'center' : 'sheet'}>

      <BookingDialogContent vendor={vendor} kind={kind} items={items} onClose={onClose} />
    </Dialog>);

}
