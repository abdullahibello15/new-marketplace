import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../utils/format';
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
  const { t } = useTranslation('vendor');
  const n = day?.bookings.length ?? 0;
  return (
    <ConfirmDialog
      open={day !== null}
      title={day ? t('calendar.blockTitle', { day: formatDate(day.date, 'EEE d MMM') }) : ''}
      description={t('calendar.blockText', { count: n })}
      confirmLabel={t('calendar.blockConfirm')}
      cancelLabel={t('calendar.keepOpen')}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel} />);


}
