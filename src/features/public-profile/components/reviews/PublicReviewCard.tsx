import { format } from 'date-fns';
import { StarRating } from '../../../../components/ui/StarRating';
import type { PublicReview } from '../../types';

const formatDate = (iso: string) => format(new Date(iso), 'd MMM yyyy');

export function PublicReviewCard({ review, vendorName }: {review: PublicReview;vendorName: string;}) {
  const headingId = `review-${review.id}`;
  return (
    <article aria-labelledby={headingId} className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 id={headingId} className="font-bold text-ink">{review.reviewerName}</h3>
          <p className="text-sm text-muted">
            <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
            {review.serviceName && <> · {review.serviceName}</>}
          </p>
        </div>
        <StarRating value={review.rating} />
      </header>

      {review.comment ?
      <p className="mt-3 whitespace-pre-line text-[15px] text-ink">{review.comment}</p> :

      <p className="mt-3 text-sm italic text-muted">Rated without a comment.</p>
      }

      {review.reply &&
      <div className="mt-4 rounded-xl bg-sand px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Reply from {vendorName} · <time dateTime={review.reply.createdAt}>{formatDate(review.reply.createdAt)}</time>
          </p>
          <p className="mt-1 whitespace-pre-line text-[15px] text-ink">{review.reply.body}</p>
        </div>
      }
    </article>);

}
