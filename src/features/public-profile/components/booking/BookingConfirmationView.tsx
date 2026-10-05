import { format } from 'date-fns';
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
  const responds = responseTimeLabel(vendor.responseTimeMinutes);
  return (
    <div role="status" className="text-center">
      <CheckCircle2Icon className="mx-auto h-10 w-10 text-pine" aria-hidden="true" />
      <p className="mt-3 text-lg font-extrabold text-ink">Request sent</p>
      <p className="mt-1 text-sm text-muted">
        {vendor.name} will get back to you{responds ? `, usually ${responds}` : ' soon'}.
      </p>
      <dl className="mt-5 divide-y divide-line rounded-xl border border-line text-left text-sm">
        <div className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted">Reference</dt>
          <dd className={`font-bold text-ink ${MONEY_CLASS}`}>{confirmation.reference}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted">For</dt>
          <dd className="text-right font-semibold text-ink">{confirmation.itemName}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted">Preferred time</dt>
          <dd className="text-right font-semibold text-ink">{format(new Date(confirmation.requestedFor), 'EEE d MMM, h:mm a')}</dd>
        </div>
      </dl>
      <Button onClick={onDone} fullWidth className="mt-5">
        Done
      </Button>
    </div>);

}
