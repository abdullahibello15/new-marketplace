import { differenceInCalendarDays, format } from 'date-fns';
import { CalendarClockIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Price } from '../../../components/ui/Price';
import type { DividendEstimate } from '../types';

/** The next declaration date, and an estimate that's clearly marked as not guaranteed. */
export function NextDividendCard({ next, now = new Date() }: {next: DividendEstimate;now?: Date;}) {
  const at = new Date(next.nextDeclarationAt);
  const days = differenceInCalendarDays(at, now);
  return (
    <section aria-labelledby="next-dividend-heading" className="rounded-2xl border border-line bg-white p-4">
      <h2 id="next-dividend-heading" className="flex items-center gap-2 font-bold text-ink">
        <CalendarClockIcon className="h-4 w-4 text-pine" aria-hidden="true" />
        Next dividend declaration
      </h2>
      <p className="mt-2 text-lg font-extrabold text-ink">{format(at, 'EEEE d MMMM yyyy')}</p>
      <p className="text-sm text-muted">{days <= 0 ? 'Today' : `In ${days} ${days === 1 ? 'day' : 'days'}`}</p>

      <div className="mt-4 rounded-xl border border-dashed border-mustard bg-[#FBF3DC] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Estimated dividend</p>
          <Badge tone="warning">Estimate, not guaranteed</Badge>
        </div>
        {next.estimate === null ?
        <p className="mt-1 text-sm text-muted">No estimate yet: there are no past declarations to base one on.</p> :

        <>
            <Price amount={next.estimate} className="mt-1 block text-2xl font-extrabold text-ink" />
            <p className="mt-1 text-xs text-muted">
              The average of your last {next.basedOn} {next.basedOn === 1 ? 'declaration' : 'declarations'}. The real amount depends on actual results and may be
              higher, lower or nothing.
            </p>
          </>
        }
      </div>
    </section>);

}
