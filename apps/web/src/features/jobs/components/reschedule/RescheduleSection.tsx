import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../utils/format';
import { CalendarClockIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { JOB_ACTOR, RESCHEDULE_MAX_REQUESTS } from '../../constants';
import { pendingReschedule, rescheduleBlockedReason, reschedulesLeft } from '../../reschedule';
import { RescheduleDialog } from './RescheduleDialog';
import type { WorkingHours } from '../../../../types/marketplace';
import type { Job, JobParty } from '../../types';

interface RescheduleSectionProps {
  job: Job;
  viewer: JobParty;
  workingHours: WorkingHours;
  busy: string | null;
  onRequest: (data: {proposedStart: string;reason: string;}) => Promise<boolean>;
  onRespond: (requestId: string, accept: boolean) => Promise<boolean>;
}

const when = (iso: string) => formatDate(iso, 'EEE d MMM, h:mm a');

/**
 * Task 56 on a Scheduled job: a pending request (answer it, or wait for the other side), or a button
 * to ask for a new time. The button explains itself when a request isn't allowed.
 */
export function RescheduleSection({ job, viewer, workingHours, busy, onRequest, onRespond }: RescheduleSectionProps) {
  const { t } = useTranslation('jobs');
  const [dialog, setDialog] = useState<'request' | 'accept' | 'decline' | null>(null);
  const pending = pendingReschedule(job);
  const blocked = rescheduleBlockedReason(job);
  const otherParty = viewer === JOB_ACTOR.Customer ? job.vendorName : job.customerName;
  const blockedId = `reschedule-blocked-${job.id}`;

  return (
    <section aria-labelledby="reschedule-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id="reschedule-heading" className="flex items-center gap-2 text-base font-bold text-ink">
        <CalendarClockIcon className="h-4 w-4 text-muted" aria-hidden="true" />
        {t('reschedule.title')}
      </h2>

      {pending ?
      <div className="mt-3 rounded-xl bg-[#F7EBCB] p-3 text-sm">
          <p className="font-bold text-ink">
            {pending.requestedBy === viewer ?
          t('reschedule.youAsked', { date: when(pending.proposedStart) }) :
          t('reschedule.theyAsked', { name: otherParty, date: when(pending.proposedStart) })}
          </p>
          <p className="mt-0.5 text-ink">“{pending.reason}”</p>
          {pending.requestedBy === viewer ?
        <p className="mt-2 text-muted">{t('reschedule.waiting', { name: otherParty })}</p> :

        <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => setDialog('decline')} disabled={busy !== null}>
                {t('reschedule.decline')}
              </Button>
              <Button size="sm" onClick={() => setDialog('accept')} loading={busy === 'reschedule-accept'}>
                {t('reschedule.acceptNew')}
              </Button>
            </div>
        }
        </div> :

      <>
          <p className="mt-1 text-sm text-muted">
            {t('reschedule.ask', { name: otherParty, left: reschedulesLeft(job), max: RESCHEDULE_MAX_REQUESTS })}
          </p>
          <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => setDialog('request')}
          disabled={blocked !== null}
          aria-describedby={blocked ? blockedId : undefined}>

            {t('reschedule.request')}
          </Button>
          {blocked &&
        <p id={blockedId} className="mt-2 text-sm text-muted">
              {blocked}
            </p>
        }
        </>
      }

      <RescheduleDialog
        open={dialog === 'request'}
        otherParty={otherParty}
        currentStart={job.scheduledAt}
        workingHours={workingHours}
        remaining={reschedulesLeft(job)}
        onSubmit={onRequest}
        onClose={() => setDialog(null)} />

      {pending &&
      <>
          <ConfirmDialog
          open={dialog === 'accept'}
          title={t('reschedule.acceptTitle')}
          description={t('reschedule.acceptText', { id: job.id, from: when(pending.fromStart), to: when(pending.proposedStart) })}
          confirmLabel={t('reschedule.acceptNew')}
          loading={busy === 'reschedule-accept'}
          onConfirm={async () => {
            if (await onRespond(pending.id, true)) setDialog(null);
          }}
          onCancel={() => setDialog(null)} />

          <ConfirmDialog
          open={dialog === 'decline'}
          title={t('reschedule.declineTitle')}
          description={t('reschedule.declineText', { id: job.id, from: when(pending.fromStart), name: otherParty })}
          confirmLabel={t('reschedule.keepOriginal')}
          destructive
          loading={busy === 'reschedule-decline'}
          onConfirm={async () => {
            if (await onRespond(pending.id, false)) setDialog(null);
          }}
          onCancel={() => setDialog(null)} />

        </>
      }
    </section>);

}
