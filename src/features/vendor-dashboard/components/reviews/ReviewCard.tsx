import { format } from 'date-fns';
import { FlagIcon, MessageSquareReplyIcon } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { StarRating } from '../../../../components/ui/StarRating';
import { ReviewReplyForm } from './ReviewReplyForm';
import type { Review } from '../../types';

interface ReviewCardProps {
  review: Review;
  replying: boolean;
  onStartReply: (id: string) => void;
  onCancelReply: () => void;
  onReply: (id: string, body: string) => Promise<boolean>;
  onReport: (review: Review) => void;
}

const formatDate = (iso: string) => format(new Date(iso), 'd MMM yyyy');

export function ReviewCard({ review, replying, onStartReply, onCancelReply, onReply, onReport }: ReviewCardProps) {
  const headingId = `review-${review.id}`;
  return (
    <article aria-labelledby={headingId} className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 id={headingId} className="font-bold text-ink">{review.customerName}</h3>
          <p className="text-sm text-muted">
            {review.item} · <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
          </p>
        </div>
        <StarRating value={review.rating} />
      </header>

      {review.comment ?
      <p className="mt-3 whitespace-pre-line text-[15px] text-ink">{review.comment}</p> :

      <p className="mt-3 text-sm italic text-muted">No comment, rating only.</p>
      }

      {review.report &&
      <Badge tone="warning" dot className="mt-3">
          Reported {formatDate(review.report.reportedAt)} · under review
        </Badge>
      }

      {review.reply &&
      <div className="mt-4 rounded-xl bg-sand px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Your reply · <time dateTime={review.reply.createdAt}>{formatDate(review.reply.createdAt)}</time>
          </p>
          <p className="mt-1 whitespace-pre-line text-[15px] text-ink">{review.reply.body}</p>
        </div>
      }

      {replying && !review.reply &&
      <ReviewReplyForm customerName={review.customerName} onSubmit={(body) => onReply(review.id, body)} onCancel={onCancelReply} />
      }

      {!replying && (!review.reply || !review.report) &&
      <div className="mt-4 flex flex-wrap gap-2">
          {!review.reply &&
        <Button variant="secondary" size="sm" icon={MessageSquareReplyIcon} onClick={() => onStartReply(review.id)}>
              Reply publicly
            </Button>
        }
          {!review.report &&
        <Button variant="ghost" size="sm" icon={FlagIcon} onClick={() => onReport(review)} aria-label={`Report review from ${review.customerName}`}>
              Report
            </Button>
        }
        </div>
      }
    </article>);

}
