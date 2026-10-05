import { Link } from 'react-router-dom';
import { formatTime } from '../../../../utils/format';
import { JobStatusBadge } from '../../../jobs/components/JobStatusBadge';
import { durationLabel } from '../../../jobs/utils/quote';
import { DASHBOARD_ROUTES } from '../../constants';
import type { BookedJob } from '../../types';

export function BookingListItem({ booking }: {booking: BookedJob;}) {
  return (
    <li>
      <Link
        to={DASHBOARD_ROUTES.request(booking.id)}
        className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 transition-colors duration-150 hover:border-ink/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

        <span className="w-16 shrink-0 pt-0.5 text-sm font-bold text-ink">{formatTime(booking.scheduledAt)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-ink">{booking.serviceName ?? `Job #${booking.id}`}</span>
          <span className="block truncate text-sm text-muted">
            {booking.customerName} · {booking.address.placeLabel}
            {booking.quote && ` · ${durationLabel(booking.quote.durationHours).toLowerCase()}`}
          </span>
        </span>
        <JobStatusBadge status={booking.status} />
      </Link>
    </li>);

}
