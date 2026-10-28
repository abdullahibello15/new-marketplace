import { forwardRef } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Price } from '../../../../components/ui/Price';
import { StarRating } from '../../../../components/ui/StarRating';
import { MODERATION_KIND, MODERATION_KIND_LABELS, MODERATION_SOURCE_LABELS, MODERATION_STATUS } from '../../constants';
import type { ModerationQueueItem } from '../../types';

interface ModerationItemCardProps {
  item: ModerationQueueItem;
  focused: boolean;
  selected: boolean;
  /** Actions shown only to roles that can use them. */
  canModerate: boolean;
  canSuspend: boolean;
  appealsTab: boolean;
  onFocus: () => void;
  onToggle: () => void;
  onAction: (action: 'approve' | 'remove' | 'warn' | 'suspend' | 'uphold' | 'overturn') => void;
}

/** One item: the content, who posted it, why it's here, their record, and the actions. */
export const ModerationItemCard = forwardRef<HTMLElement, ModerationItemCardProps>(function ModerationItemCard(
{ item, focused, selected, canModerate, canSuspend, appealsTab, onFocus, onToggle, onAction },
ref)
{
  const c = item.content;
  const pending = item.status === MODERATION_STATUS.Pending;
  const appealPending = item.appeal?.status === 'pending';
  const headingId = `mod-${item.id}`;

  return (
    <article
      ref={ref}
      tabIndex={-1}
      onFocus={onFocus}
      onClick={onFocus}
      aria-labelledby={headingId}
      className={`rounded-2xl border bg-white p-4 outline-none transition-shadow ${focused ? 'border-pine ring-2 ring-pine/30' : 'border-line'}`}>

      <div className="flex gap-3">
        {canModerate && (pending || appealsTab && appealPending) &&
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${MODERATION_KIND_LABELS[item.kind]} from ${item.vendorName}`}
          className="mt-1 h-4 w-4 shrink-0 accent-pine" />

        }
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="flex flex-wrap items-center gap-2 font-bold text-ink">
            {MODERATION_KIND_LABELS[item.kind]} · {item.vendorName}
            <Badge tone={item.source === 'user_report' ? 'danger' : item.source === 'new_upload' ? 'info' : 'warning'}>{MODERATION_SOURCE_LABELS[item.source]}</Badge>
            {!pending && <Badge tone={item.status === MODERATION_STATUS.Removed ? 'neutral' : 'success'}>{item.status === MODERATION_STATUS.Removed ? 'Removed' : 'Approved'}</Badge>}
            {item.appeal && <Badge tone={appealPending ? 'warning' : 'neutral'}>Appeal {item.appeal.status}</Badge>}
          </h3>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            {c.imageUrl && item.kind !== MODERATION_KIND.Review &&
            <img src={c.imageUrl} alt={`${MODERATION_KIND_LABELS[item.kind]} under review`} className="h-32 w-full rounded-xl object-cover sm:w-44" />
            }
            <div className="min-w-0 flex-1 text-sm">
              {item.kind === MODERATION_KIND.Review &&
              <div className="rounded-xl bg-sand p-3">
                  <div className="flex items-center gap-2">
                    {c.rating !== null && <StarRating value={c.rating} />}
                    <span className="font-semibold">{c.title}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-ink">{c.text ?? 'Review no longer available.'}</p>
                </div>
              }
              {item.kind === MODERATION_KIND.Product &&
              <div>
                  <p className="font-bold">{c.title ?? 'Product'}</p>
                  {c.price !== null && <Price amount={c.price} className="text-ink" />}
                  {c.text && <p className="mt-1 text-muted">{c.text}</p>}
                </div>
              }
              <dl className="mt-2 space-y-1">
                <div>
                  <dt className="inline font-semibold">Why it’s here: </dt>
                  <dd className="inline">{item.flag.reason}</dd>
                </div>
                {item.flag.reportedBy &&
                <div>
                    <dt className="inline font-semibold">Reported by: </dt>
                    <dd className="inline">
                      {item.flag.reportedBy}
                      {item.flag.reportCount > 1 && ` (+${item.flag.reportCount - 1} more)`}
                    </dd>
                  </div>
                }
                {item.flag.keywords.length > 0 &&
                <div className="flex flex-wrap items-center gap-1">
                    <dt className="font-semibold">Matched:</dt>
                    {item.flag.keywords.map((k) =>
                  <dd key={k}><Badge tone="danger">{k}</Badge></dd>
                  )}
                  </div>
                }
                {item.flag.duplicateOf &&
                <div>
                    <dt className="inline font-semibold">Same image as: </dt>
                    <dd className="inline">{item.flag.duplicateOf.vendorName}</dd>
                  </div>
                }
                <div>
                  <dt className="inline font-semibold">Posted by: </dt>
                  <dd className="inline">
                    {item.postedBy.name} ({item.postedBy.role}) · {formatDistanceToNowStrict(new Date(item.createdAt), { addSuffix: true })}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 rounded-lg bg-sand px-2.5 py-1.5 text-xs text-muted">
                {item.vendorName}’s record: {item.poster.removals} removed · {item.poster.warnings} warnings · {item.poster.inQueue} in queue
                {item.poster.rating !== null && ` · ${item.poster.rating.toFixed(1)}★`}
                {item.poster.suspended && ' · suspended'}
              </p>
              {item.decision &&
              <p className="mt-2 text-xs text-muted">
                  {item.decision.action === 'removed' ? 'Removed' : 'Approved'} by {item.decision.by} on {format(new Date(item.decision.at), 'd MMM yyyy')}
                  {item.decision.reason && `: ${item.decision.reason}`}
                </p>
              }
              {item.appeal &&
              <p className="mt-2 rounded-lg border border-mustard bg-[#FBF3DC] px-2.5 py-1.5 text-sm">
                  <strong>Appeal ({format(new Date(item.appeal.at), 'd MMM')}):</strong> “{item.appeal.message}”
                </p>
              }
            </div>
          </div>

          {canModerate &&
          <div className="mt-3 flex flex-wrap gap-2">
              {appealsTab && appealPending ?
            <>
                  <Button size="sm" onClick={() => onAction('overturn')}>Reinstate (accept appeal)</Button>
                  <Button size="sm" variant="outline" onClick={() => onAction('uphold')}>Keep removed</Button>
                </> :
            pending ?
            <>
                  <Button size="sm" onClick={() => onAction('approve')}>Approve <kbd className="ml-1 text-xs opacity-70">A</kbd></Button>
                  <Button size="sm" variant="danger" onClick={() => onAction('remove')}>Remove <kbd className="ml-1 text-xs opacity-70">R</kbd></Button>
                  <Button size="sm" variant="outline" onClick={() => onAction('warn')}>Warn vendor <kbd className="ml-1 text-xs opacity-70">W</kbd></Button>
                  {canSuspend && !item.poster.suspended &&
              <Button size="sm" variant="ghost" onClick={() => onAction('suspend')}>Suspend vendor <kbd className="ml-1 text-xs opacity-70">S</kbd></Button>
              }
                </> :
            null}
            </div>
          }
        </div>
      </div>
    </article>);

});
