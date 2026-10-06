import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { BellIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useNotifications } from '../../hooks/useNotifications';
import type { JobParty } from '../../types';

const COLLAPSED_COUNT = 3;

interface NotificationListProps {
  recipient: JobParty;
  recipientId: string;
  /** Where a notification leads: the customer's job page or the vendor's request page. */
  linkFor: (jobId: string) => string;
}

/** MOCK in-app notifications: one item per status change or reschedule event on this person's jobs. */
export function NotificationList({ recipient, recipientId, linkFor }: NotificationListProps) {
  const n = useNotifications(recipient, recipientId);
  const [expanded, setExpanded] = useState(false);

  if (n.status === 'error') {
    return (
      <p role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-clay/40 bg-clay-soft px-4 py-3 text-sm text-ink">
        Couldn’t load updates.
        <Button variant="outline" size="sm" onClick={n.reload}>
          Try again
        </Button>
      </p>);

  }
  if (n.status === 'loading' && n.items.length === 0) {
    return <div role="status" aria-label="Loading updates" className="h-24 animate-pulse rounded-2xl bg-sand" />;
  }
  if (n.items.length === 0) return null;

  const shown = expanded ? n.items : n.items.slice(0, COLLAPSED_COUNT);

  return (
    <section aria-labelledby="updates-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="updates-heading" className="flex items-center gap-2 text-base font-bold text-ink">
          <BellIcon className="h-4 w-4 text-muted" aria-hidden="true" />
          Updates
          {n.unread > 0 &&
          <span className="rounded-full bg-clay px-2 text-xs font-bold leading-5 text-white">
              {n.unread}
              <span className="sr-only"> unread</span>
            </span>
          }
        </h2>
        {n.unread > 0 &&
        <Button variant="ghost" size="sm" onClick={n.markAllRead} loading={n.marking}>
            Mark all read
          </Button>
        }
      </div>
      <ul className="mt-3 divide-y divide-line">
        {shown.map((item) =>
        <li key={item.id}>
            <Link
            to={linkFor(item.jobId)}
            className="flex gap-3 rounded-lg py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

              <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-transparent' : 'bg-clay'}`} />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${item.read ? 'font-semibold text-ink' : 'font-bold text-ink'}`}>
                  {item.title}
                  {!item.read && <span className="sr-only"> (unread)</span>}
                </span>
                <span className="block text-sm text-muted">{item.body}</span>
                <span className="block text-xs text-muted">{formatDistanceToNowStrict(new Date(item.createdAt), { addSuffix: true })}</span>
              </span>
            </Link>
          </li>
        )}
      </ul>
      {n.items.length > COLLAPSED_COUNT &&
      <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} className="mt-1">
          {expanded ? 'Show fewer' : `Show all ${n.items.length}`}
        </Button>
      }
    </section>);

}
