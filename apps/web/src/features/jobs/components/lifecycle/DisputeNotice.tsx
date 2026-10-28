import { useTranslation } from 'react-i18next';
import { ShieldAlertIcon, ShieldCheckIcon } from 'lucide-react';
import { disputeOutcomeLabel, disputeReasonLabel } from '../../../../i18n/labels';
import { formatDate, formatNaira } from '../../../../utils/format';
import { DISPUTE_OUTCOME_LABELS, DISPUTE_REASON_LABELS } from '../../constants';
import type { JobDispute } from '../../types';

/** Shown to both sides while Gwani's team reviews a reported problem, and with the decision once it's made. Used for jobs and orders. */
export function DisputeNotice({ dispute, viewer }: {dispute: JobDispute;viewer: 'customer' | 'vendor';}) {
  const { t } = useTranslation('jobs');
  const resolution = dispute.resolution;
  return (
    <section aria-labelledby="dispute-heading" className={`rounded-2xl border p-4 lg:p-5 ${resolution ? 'border-line bg-white' : 'border-clay/50 bg-clay-soft'}`}>
      <h2 id="dispute-heading" className={`flex items-center gap-2 text-base font-bold ${resolution ? 'text-ink' : 'text-clay-dark'}`}>
        {resolution ? <ShieldCheckIcon className="h-4 w-4 text-pine" aria-hidden="true" /> : <ShieldAlertIcon className="h-4 w-4" aria-hidden="true" />}
        {viewer === 'customer' ? t('dispute.customerTitle') : t('dispute.vendorTitle')}
      </h2>
      <p className="mt-1 text-sm font-semibold text-ink">{disputeReasonLabel(dispute.reason, DISPUTE_REASON_LABELS[dispute.reason])}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-ink">“{dispute.details}”</p>
      {resolution ?
      <div className="mt-3 rounded-xl bg-sand px-3 py-2 text-sm text-ink">
          <p className="font-bold">{disputeOutcomeLabel(resolution.outcome, DISPUTE_OUTCOME_LABELS[resolution.outcome])}</p>
          {resolution.refundAmount > 0 && <p>{t('dispute.refunded', { amount: formatNaira(resolution.refundAmount) })}</p>}
          {resolution.reason && <p className="mt-1">{t('dispute.reason', { reason: resolution.reason })}</p>}
          <p className="mt-1 text-xs text-muted">{t('dispute.decided', { date: formatDate(resolution.at, 'd MMM, h:mm a') })}</p>
        </div> :

      <p className="mt-3 text-sm text-muted">
          {t('dispute.reported', { date: formatDate(dispute.at, 'd MMM, h:mm a') })}
        </p>
      }
    </section>);

}
