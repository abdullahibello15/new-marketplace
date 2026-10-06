import { format } from 'date-fns';
import { Button } from '../../../../components/ui/Button';
import { REMINDER_RULES } from '../../config';
import { REMINDER_STATUS, REMINDER_STATUS_LABELS, SMS_SEGMENT_LENGTH } from '../../constants';
import { useNow } from '../../hooks/useNow';
import { timeToFire } from '../../utils/countdown';
import type { ScheduledReminder } from '../../types';

interface DevReminderTableProps {
  reminders: ScheduledReminder[];
  busy: string | null;
  onSendNow: (id: string) => void;
}

/** Every reminder with a live countdown to when it fires. Dev builds only. */
export function DevReminderTable({ reminders, busy, onSendNow }: DevReminderTableProps) {
  const now = useNow();
  if (reminders.length === 0) return <p className="text-sm text-muted">No reminders yet. Accept a quote to schedule some.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Scheduled reminders</caption>
        <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="px-3 py-2">Job</th>
            <th scope="col" className="px-3 py-2">To</th>
            <th scope="col" className="px-3 py-2">Rule</th>
            <th scope="col" className="px-3 py-2">Fires at</th>
            <th scope="col" className="px-3 py-2">Time to fire</th>
            <th scope="col" className="px-3 py-2">Status</th>
            <th scope="col" className="px-3 py-2">SMS text</th>
            <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {reminders.map((r) => {
            const pending = r.status === REMINDER_STATUS.Scheduled;
            const long = r.message.sms.length > SMS_SEGMENT_LENGTH;
            return (
              <tr key={r.id} className={pending ? '' : 'text-muted'}>
                <td className="px-3 py-2 font-semibold">#{r.jobId}</td>
                <td className="px-3 py-2">{r.recipient}</td>
                <td className="px-3 py-2">{REMINDER_RULES.find((x) => x.id === r.ruleId)?.lead} before</td>
                <td className="whitespace-nowrap px-3 py-2">{format(new Date(r.fireAt), 'EEE d MMM, HH:mm:ss')}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono">{pending ? timeToFire(r.fireAt, now) : '—'}</td>
                <td className="px-3 py-2">
                  {REMINDER_STATUS_LABELS[r.status]}
                  {r.closedReason && <span className="block text-xs">{r.closedReason}</span>}
                </td>
                <td className="max-w-xs px-3 py-2">
                  <span className="line-clamp-2">{r.message.sms}</span>
                  <span className={`text-xs ${long ? 'font-bold text-clay-dark' : 'text-muted'}`}>
                    {r.message.sms.length}/{SMS_SEGMENT_LENGTH}
                    {long ? ' – over one SMS' : ''}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {pending &&
                  <Button size="sm" variant="outline" loading={busy === r.id} disabled={busy !== null} onClick={() => onSendNow(r.id)}>
                      Send now
                    </Button>
                  }
                </td>
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}
