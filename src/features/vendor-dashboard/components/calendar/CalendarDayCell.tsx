import { format } from 'date-fns';
import { formatTime } from '../../../../utils/format';
import { CALENDAR_VIEW } from '../../constants';
import type { CalendarDay, CalendarView, DayAvailability } from '../../types';

const WEEK_PREVIEW_LIMIT = 3;

const AVAILABILITY: Record<DayAvailability, {label: string;spoken: string;cell: string;}> = {
  open: { label: '', spoken: 'Open', cell: 'bg-white text-ink hover:bg-cream' },
  closed: { label: 'Closed', spoken: 'Outside working hours', cell: 'bg-sand text-muted' },
  blocked: { label: 'Day off', spoken: 'Day off', cell: 'bg-clay-soft text-clay-dark' }
};

interface CalendarDayCellProps {
  day: CalendarDay;
  view: CalendarView;
  selected: boolean;
  onSelect: (date: Date) => void;
}

function spokenLabel(day: CalendarDay): string {
  const n = day.bookings.length;
  const bookings = n === 0 ? 'no bookings' : `${n} ${n === 1 ? 'booking' : 'bookings'}`;
  return `${format(day.date, 'EEEE d MMMM')}${day.isToday ? ', today' : ''}. ${AVAILABILITY[day.availability].spoken}, ${bookings}.`;
}

export function CalendarDayCell({ day, view, selected, onSelect }: CalendarDayCellProps) {
  const a = AVAILABILITY[day.availability];
  const n = day.bookings.length;
  const isWeek = view === CALENDAR_VIEW.Week;

  return (
    <button
      type="button"
      data-date={day.key}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(day.date)}
      aria-label={spokenLabel(day)}
      aria-current={day.isToday ? 'date' : undefined}
      className={`flex w-full flex-col items-start rounded-lg p-1 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-1 sm:p-2 ${
      isWeek ? 'min-h-[5.5rem] sm:min-h-[10rem]' : 'min-h-[3.25rem] sm:min-h-[5.5rem]'} ${
      a.cell} ${selected ? 'ring-2 ring-pine' : 'ring-1 ring-line'} ${day.inPeriod ? '' : 'opacity-40'}`}>

      <span
        className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm font-bold ${
        day.isToday ? 'bg-pine text-white' : ''} ${
        day.isPast && !day.isToday ? 'font-semibold opacity-70' : ''}`}>

        {format(day.date, 'd')}
      </span>

      {a.label && <span className="mt-0.5 hidden text-[11px] font-bold sm:block">{a.label}</span>}

      {n > 0 &&
      <>
          {/* Phones: one dot per booking (max 3). */}
          <span className="mt-auto flex gap-0.5 sm:hidden" aria-hidden="true">
            {day.bookings.slice(0, 3).map((b) =>
          <span key={b.id} className="h-1.5 w-1.5 rounded-full bg-pine" />
          )}
          </span>

          {isWeek ?
        <span className="mt-1 hidden w-full space-y-1 sm:block" aria-hidden="true">
              {day.bookings.slice(0, WEEK_PREVIEW_LIMIT).map((b) =>
          <span key={b.id} className="block truncate rounded bg-pine/10 px-1.5 py-0.5 text-[11px] font-semibold text-pine">
                  {formatTime(b.scheduledAt)} {b.serviceName ?? b.customerName}
                </span>
          )}
              {n > WEEK_PREVIEW_LIMIT &&
          <span className="block px-1.5 text-[11px] font-semibold text-muted">+{n - WEEK_PREVIEW_LIMIT} more</span>
          }
            </span> :

        <span className="mt-auto hidden rounded bg-pine px-1.5 text-[11px] font-bold leading-5 text-white sm:inline-block" aria-hidden="true">
              {n} {n === 1 ? 'job' : 'jobs'}
            </span>
        }
        </>
      }
    </button>);

}
