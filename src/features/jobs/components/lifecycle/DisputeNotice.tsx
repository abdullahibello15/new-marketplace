import { format } from 'date-fns';
import { ShieldAlertIcon } from 'lucide-react';
import { DISPUTE_REASON_LABELS } from '../../constants';
import type { JobDispute } from '../../types';

/** Shown to both sides while Gwani's team reviews a reported problem. */
export function DisputeNotice({ dispute, viewer }: {dispute: JobDispute;viewer: 'customer' | 'vendor';}) {
  return (
    <section aria-labelledby="dispute-heading" className="rounded-2xl border border-clay/50 bg-clay-soft p-4 lg:p-5">
      <h2 id="dispute-heading" className="flex items-center gap-2 text-base font-bold text-clay-dark">
        <ShieldAlertIcon className="h-4 w-4" aria-hidden="true" />
        {viewer === 'customer' ? 'You reported a problem' : 'The customer reported a problem'}
      </h2>
      <p className="mt-1 text-sm font-semibold text-ink">{DISPUTE_REASON_LABELS[dispute.reason]}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-ink">“{dispute.details}”</p>
      <p className="mt-3 text-sm text-muted">
        Reported {format(new Date(dispute.at), 'd MMM, h:mm a')}. Gwani’s team will contact both of you within 2 working days.
      </p>
    </section>);

}
