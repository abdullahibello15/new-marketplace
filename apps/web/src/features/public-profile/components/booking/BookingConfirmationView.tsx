import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../utils/format';
import { CheckCircle2Icon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { MONEY_CLASS } from '../../../../components/ui/moneyStyles';
import { responseTimeLabel } from '../../utils/profileText';
import type { Vendor } from '../../../../types/marketplace';
import type { BookingConfirmation } from '../../types';

interface BookingConfirmationViewProps {
  confirmation: BookingConfirmation;
  vendor: Vendor;
  onDone: () => void;
}

export function BookingConfirmationView({ confirmation, vendor, onDone }: BookingConfirmationViewProps) {
  const { t } = useTranslation('discovery');
  const responds = responseTimeLabel(vendor.responseTimeMinutes);
  return (
    <div role="status" className="text-center">
      <CheckCircle2Icon className="mx-auto h-10 w-10 text-pine" aria-hidden="true" />
      <p className="mt-3 text-lg font-extrabold text-ink">{t('booking.sentTitle')}</p>
      <p className="mt-1 text-sm text-muted">
        {responds ? t('booking.sentWithTime', { name: vendor.name, time: responds }) : t('booking.sentSoon', { name: vendor.name })}
      </p>
      <dl className="mt-5 divide-y divide-line rounded-xl border border-line text-left text-sm">
        <div className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted">{t('booking.reference')}</dt>
          <dd className={`font-bold text-ink ${MONEY_CLASS}`}>{confirmation.reference}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted">{t('booking.for')}</dt>
          <dd className="text-right font-semibold text-ink">{confirmation.itemName}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted">{t('booking.preferredTime')}</dt>
          <dd className="text-right font-semibold text-ink">{formatDate(confirmation.requestedFor, 'EEE d MMM, h:mm a')}</dd>
        </div>
      </dl>
      <Button onClick={onDone} fullWidth className="mt-5">
        {t('common:action.done')}
      </Button>
    </div>);

}
