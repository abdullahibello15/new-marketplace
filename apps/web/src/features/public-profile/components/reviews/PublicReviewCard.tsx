import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../../utils/format';
import { StarRating } from '../../../../components/ui/StarRating';
import type { PublicReview } from '../../types';

const reviewDate = (iso: string) => formatDate(iso, 'd MMM yyyy');

export function PublicReviewCard({ review, vendorName }: {review: PublicReview;vendorName: string;}) {
  const { t } = useTranslation('discovery');
  const headingId = `review-${review.id}`;
  return (
    <article aria-labelledby={headingId} className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 id={headingId} className="font-bold text-ink">{review.reviewerName}</h3>
          <p className="text-sm text-muted">
            <time dateTime={review.createdAt}>{reviewDate(review.createdAt)}</time>
            {review.serviceName && <> · {review.serviceName}</>}
          </p>
        </div>
        <StarRating value={review.rating} />
      </header>

      {review.comment ?
      <p className="mt-3 whitespace-pre-line text-[15px] text-ink">{review.comment}</p> :

      <p className="mt-3 text-sm italic text-muted">{t('profile.noComment')}</p>
      }

      {review.reply &&
      <div className="mt-4 rounded-xl bg-sand px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            {t('profile.replyFrom', { name: vendorName })} · <time dateTime={review.reply.createdAt}>{reviewDate(review.reply.createdAt)}</time>
          </p>
          <p className="mt-1 whitespace-pre-line text-[15px] text-ink">{review.reply.body}</p>
        </div>
      }
    </article>);

}
