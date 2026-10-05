import { Link } from 'react-router-dom';
import { CalendarClockIcon, MapPinIcon } from 'lucide-react';
import { Price } from '../../../components/ui/Price';
import { JOB_STATUS } from '../constants';
import { jobWhenText } from '../utils/jobText';
import { isQuoteExpired } from '../utils/quote';
import { JobStatusBadge } from './JobStatusBadge';
import type { Job } from '../types';

interface JobListItemProps {
  job: Job;
  /** Where the card links to: the customer's job page or the vendor's request page. */
  to: string;
  /** The other party's name: the vendor (customer view) or the customer (vendor view). */
  title: string;
  /** Prompt shown when this person needs to act, e.g. "Quote ready: respond". */
  actionHint?: string | null;
  highlighted?: boolean;
}

/** One job in a list. Same card in My Jobs (customer) and Requests (vendor). */
export function JobListItem({ job, to, title, actionHint, highlighted = false }: JobListItemProps) {
  const price = job.agreedPrice ?? (job.quote && !isQuoteExpired(job.quote) && job.status === JOB_STATUS.Quoted ? job.quote.amount : null);
  return (
    <Link
      to={to}
      className={`flex h-full flex-col rounded-2xl border bg-white p-4 transition-colors duration-150 hover:border-ink/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 lg:p-5 ${
      highlighted ? 'border-mustard ring-1 ring-mustard' : 'border-line'}`}>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-ink">{title}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">
            <span className="font-semibold text-ink">#{job.id}</span> · {job.serviceName ?? job.description}
          </p>
        </div>
        <JobStatusBadge status={job.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <CalendarClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {jobWhenText(job)}
        </span>
        {price !== null && <Price amount={price} className="text-base font-bold text-ink" />}
      </div>
      <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted">
        <MapPinIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{job.address.placeLabel}</span>
      </p>
      {actionHint && <p className="mt-3 rounded-lg bg-[#F7EBCB] px-3 py-1.5 text-sm font-bold text-mustard-dark">{actionHint}</p>}
    </Link>);

}
