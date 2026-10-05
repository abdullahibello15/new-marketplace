import { useBookingForm } from '../../hooks/useBookingForm';
import { BookingConfirmationView } from './BookingConfirmationView';
import { BookingForm } from './BookingForm';
import type { CategoryKind, Vendor } from '../../../../types/marketplace';
import type { BookableItem } from '../../types';

interface BookingDialogContentProps {
  vendor: Vendor;
  kind: CategoryKind;
  items: BookableItem[];
  onClose: () => void;
}

/** Mounted each time the dialog opens, so every request starts with a blank form. */
export function BookingDialogContent({ vendor, kind, items, onClose }: BookingDialogContentProps) {
  const { form, submit, confirmation } = useBookingForm(vendor, items);
  if (confirmation) return <BookingConfirmationView confirmation={confirmation} vendor={vendor} onDone={onClose} />;
  return <BookingForm form={form} onSubmit={submit} onCancel={onClose} vendor={vendor} kind={kind} items={items} />;
}
