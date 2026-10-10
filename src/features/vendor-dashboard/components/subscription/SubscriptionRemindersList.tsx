import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../utils/format';
import { BellIcon, CheckIcon } from 'lucide-react';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { REMINDER_ROUTES, REMINDER_STATUS } from '../../../reminders/constants';
import { listSubscriptionReminders } from '../../../reminders/services/reminderService';

interface SubscriptionRemindersListProps {
  /** Whose renewal reminders: see subscriptionReminders.ts for the keys. */
  reminderKey: string;
  /** Reloads when this changes (e.g. the end date after a renewal). */
  refreshKey: string;
  /** Where the person changes how they're reminded. */
  preferencesHref?: string;
}

/** "Reminders scheduled": when renewal reminders go out (push, SMS and in-app, per preferences). */
export function SubscriptionRemindersList({ reminderKey, refreshKey, preferencesHref = REMINDER_ROUTES.vendorPreferences }: SubscriptionRemindersListProps) {
  const { t } = useTranslation('vendor');
  const load = useCallback(
    () => listSubscriptionReminders(reminderKey),
    // refreshKey is only a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reminderKey, refreshKey]
  );
  const { data, status, error, reload } = useAsyncData(load);
  const shown = (data ?? []).filter((r) => r.status === REMINDER_STATUS.Scheduled || r.status === REMINDER_STATUS.Sent);

  return (
    <section aria-labelledby="sub-reminders-heading" className="rounded-2xl border border-line bg-white p-4 text-sm lg:p-5">
      <h2 id="sub-reminders-heading" className="flex items-center gap-2 font-bold text-ink">
        <BellIcon className="h-4 w-4 text-pine" aria-hidden="true" />
        {t('subscription.reminders.title')}
      </h2>
      {status === 'error' &&
      <p role="alert" className="mt-1 text-muted">
          {t('subscription.reminders.failed')}{' '}
          <button type="button" onClick={reload} className="rounded font-semibold text-clay-dark hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">
            {t('common:action.retry')}
          </button>
          <span className="sr-only">{error}</span>
        </p>
      }
      {!data && status === 'loading' && <div role="status" aria-label={t('subscription.reminders.loading')} className="mt-2 h-16 animate-pulse rounded-lg bg-sand" />}
      {data && shown.length === 0 && <p className="mt-1 text-muted">{t('subscription.reminders.none')}</p>}
      {shown.length > 0 &&
      <ul className="mt-2 space-y-1">
          {shown.map((r) =>
        <li key={r.id} className="flex flex-wrap items-center gap-x-1.5">
              {r.status === REMINDER_STATUS.Sent && <CheckIcon className="h-3.5 w-3.5 text-pine" aria-hidden="true" />}
              <span className={r.status === REMINDER_STATUS.Sent ? 'text-muted' : 'font-semibold text-ink'}>{formatDate(r.fireAt, 'EEE d MMM, h:mm a')}</span>
              <span className="text-muted">
                · {r.label}
                {r.status === REMINDER_STATUS.Sent ? ` ${t('subscription.reminders.sent')}` : ''}
              </span>
            </li>
        )}
        </ul>
      }
      <Link to={preferencesHref} className="mt-2 inline-block rounded font-semibold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
        {t('subscription.reminders.change')}
      </Link>
    </section>);

}
