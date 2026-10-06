import { format } from 'date-fns';
import { Badge, type BadgeTone } from '../../../../components/ui/Badge';
import { DELIVERY_OUTCOME_LABELS, REMINDER_CHANNEL_LABELS } from '../../constants';
import type { DeliveryLogEntry, DeliveryOutcome } from '../../types';

const TONE: Record<DeliveryOutcome, BadgeTone> = { delivered: 'success', failed: 'danger', skipped: 'neutral' };

/** MOCK "sent" log: every channel attempt, newest first. Dev builds only. */
export function DeliveryLogList({ log }: {log: DeliveryLogEntry[];}) {
  if (log.length === 0) return <p className="text-sm text-muted">Nothing sent yet. Use Send now, or wait for a reminder to fall due.</p>;
  return (
    <ol className="divide-y divide-line rounded-2xl border border-line bg-white">
      {log.map((e) =>
      <li key={e.id} className="px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TONE[e.outcome]} dot>
              {DELIVERY_OUTCOME_LABELS[e.outcome]}
            </Badge>
            <span className="font-bold text-ink">{REMINDER_CHANNEL_LABELS[e.channel]}</span>
            <span className="text-muted">
              → {e.recipient} {e.recipientId} · job #{e.jobId} · {e.detail}
            </span>
            <time dateTime={e.at} className="ml-auto font-mono text-xs text-muted">
              {format(new Date(e.at), 'd MMM HH:mm:ss')}
            </time>
          </div>
          <p className="mt-1 text-ink">{e.text}</p>
        </li>
      )}
    </ol>);

}
