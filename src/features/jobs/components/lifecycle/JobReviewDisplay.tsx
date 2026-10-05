import { PublicReviewCard } from '../../../public-profile/components/reviews/PublicReviewCard';
import type { Job, JobReview } from '../../types';

/** The review left on this job, shown with the same card customers see on the vendor's profile. */
export function JobReviewDisplay({ job, review }: {job: Job;review: JobReview;}) {
  return (
    <section aria-labelledby="job-review-heading">
      <h2 id="job-review-heading" className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
        Review
      </h2>
      <PublicReviewCard
        vendorName={job.vendorName}
        review={{
          id: `job-${job.id}`,
          reviewerName: job.customerName,
          rating: review.rating,
          comment: review.comment,
          serviceName: job.serviceName,
          createdAt: review.at,
          reply: null
        }} />

    </section>);

}
