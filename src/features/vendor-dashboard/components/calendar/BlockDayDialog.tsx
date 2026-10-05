import { format } from 'date-fns';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import type { CalendarDay } from '../../types';

interface BlockDayDialogProps {
  day: CalendarDay | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Shown only when the day already has bookings. */
export function BlockDayDialog({ day, loading, onConfirm, onCancel }: BlockDayDialogProps) {
  const n = day?.bookings.length ?? 0;
  return (
    <ConfirmDialog
      open={day !== null}
      title={day ? `Take ${format(day.date, 'EEE d MMM')} off?` : ''}
      description={`You already have ${n} ${n === 1 ? 'booking' : 'bookings'} that day. Blocking it stops new bookings, but existing ones stay. Contact those customers if you need to reschedule.`}
      confirmLabel="Block off day"
      cancelLabel="Keep it open"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel} />);


}
