import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import { formatDate } from '../../../utils/format';
import { BellIcon, BellOffIcon, CheckIcon } from 'lucide-react';
import { JOB_ACTOR, JOB_STATUS } from '../../jobs/constants';
import { REMINDER_ROUTES, REMINDER_STATUS } from '../constants';
import { useJobReminders } from '../hooks/useJobReminders';
import { useNow } from '../hooks/useNow';
import { timeToFire } from '../utils/countdown';
import type { Job, JobParty } from '../../jobs/types';
import type { NotificationPreferences } from '../types';

const when = (iso: string) => formatDate(iso, 'EEE d MMM, h:mm a');

/** "push and SMS", "push", "the app only". In-app is always on unless opted out. */
function channelsText(p: NotificationPreferences): string {
  const push = p.push;
  const sms = Boolean(p.sms && p.phone);
  const key = push && sms ? 'channelsBoth' : push ? 'channelsPush' : sms ? 'channelsSms' : 'channelsApp';
  return i18n.t(`jobs:reminder.${key}`);
}

/** Dev builds only: live time-to-fire next to each pending reminder. */
function DevCountdown({ fireAt }: {fireAt: string;}) {
  const now = useNow();
  return <span className="ml-1 rounded bg-ink/80 px-1.5 font-mono text-[11px] text-white">dev: {timeToFire(fireAt, now)}</span>;
}

/** "Reminders scheduled" on the job page: when this person's reminders go out, and how. */
export function JobRemindersLine({ job, viewer }: {job: Job;viewer: JobParty;}) {
  const { t } = useTranslation('jobs');
  const { data, status, error, reload } = useJobReminders(job, viewer);
  const prefsHref = viewer === JOB_ACTOR.Customer ? REMINDER_ROUTES.customerPreferences : REMINDER_ROUTES.vendorPreferences;

  const visible = (data?.reminders ?? []).filter((r) => r.status === REMINDER_STATUS.Scheduled || r.status === REMINDER_STATUS.Sent);
  // Nothing to say for jobs that were never booked in.
  if (job.status !== JOB_STATUS.Scheduled && visible.length === 0) return null;

  return (
    <section aria-labelledby="reminders-line-heading" className="rounded-2xl border border-line bg-white p-4 text-sm lg:p-5">
      <h2 id="reminders-line-heading" className="flex items-center gap-2 font-bold text-ink">
        {data?.prefs.optedOut ? <BellOffIcon className="h-4 w-4 text-muted" aria-hidden="true" /> : <BellIcon className="h-4 w-4 text-pine" aria-hidden="true" />}
        {data?.prefs.optedOut ? t('reminder.off') : t('reminder.scheduled')}
      </h2>

      {status === 'error' &&
      <p role="alert" className="mt-1 text-muted">
          {t('reminder.failed')}{' '}
          <button type="button" onClick={reload} className="rounded font-semibold text-clay-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">
            {t('common:action.retry')}
          </button>
          <span className="sr-only">{error}</span>
        </p>
      }
      {status === 'loading' && !data && <div role="status" aria-label={t('reminder.loading')} className="mt-2 h-10 animate-pulse rounded-lg bg-sand" />}

      {data && data.prefs.optedOut &&
      <p className="mt-1 text-muted">{t('reminder.optedOut')}</p>
      }
      {data && !data.prefs.optedOut &&
      <>
          {visible.length === 0 ?
        <p className="mt-1 text-muted">{t('reminder.tooClose')}</p> :

        <ul className="mt-2 space-y-1">
              {visible.map((r) =>
          <li key={r.id} className="flex flex-wrap items-center gap-x-1.5 text-ink">
                  {r.status === REMINDER_STATUS.Sent && <CheckIcon className="h-3.5 w-3.5 text-pine" aria-hidden="true" />}
                  <span className={r.status === REMINDER_STATUS.Sent ? 'text-muted' : 'font-semibold'}>{when(r.fireAt)}</span>
                  <span className="text-muted">
                    · {r.label}{r.status === REMINDER_STATUS.Sent ? ` ${t('reminder.sent')}` : ''}
                  </span>
                  {import.meta.env.DEV && r.status === REMINDER_STATUS.Scheduled && <DevCountdown fireAt={r.fireAt} />}
                </li>
          )}
            </ul>
        }
          <p className="mt-2 text-muted">{channelsText(data.prefs)}.</p>
        </>
      }

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Link to={prefsHref} className="rounded font-semibold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
          {data?.prefs.optedOut ? t('reminder.turnOn') : t('reminder.change')}
        </Link>
        {import.meta.env.DEV &&
        <Link to={REMINDER_ROUTES.devPanel} className="rounded font-mono text-xs font-semibold text-muted hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
            Reminder dev panel
          </Link>
        }
      </div>
    </section>);

}
