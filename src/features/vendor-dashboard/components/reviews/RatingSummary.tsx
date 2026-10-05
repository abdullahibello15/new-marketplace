import { StarIcon } from 'lucide-react';
import { StarRating } from '../../../../components/ui/StarRating';
import { STAR_LEVELS } from '../../constants';
import type { ReviewStats } from '../../types';

export function RatingSummary({ stats }: {stats: ReviewStats;}) {
  return (
    <section aria-labelledby="rating-summary-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id="rating-summary-heading" className="sr-only">Rating summary</h2>
      <div className="flex items-center gap-4">
        <p className="text-5xl font-extrabold tracking-tight text-ink">{stats.total ? stats.average.toFixed(1) : '–'}</p>
        <div>
          <StarRating value={stats.average} size="md" />
          <p className="mt-1 text-sm text-muted">
            {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {STAR_LEVELS.map((level) => {
          const count = stats.counts[level];
          const share = stats.total ? count / stats.total * 100 : 0;
          return (
            <li key={level} className="flex items-center gap-3 text-sm">
              <span className="flex w-8 shrink-0 items-center gap-1 font-bold text-ink" aria-hidden="true">
                {level}
                <StarIcon className="h-3.5 w-3.5 text-mustard" fill="currentColor" />
              </span>
              <span className="sr-only">{level} {level === 1 ? 'star' : 'stars'}:</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-sand" aria-hidden="true">
                <span className="block h-full rounded-full bg-mustard" style={{ width: `${share}%` }} />
              </span>
              <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-muted">{count}</span>
            </li>);

        })}
      </ul>
    </section>);

}
