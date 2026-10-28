import { format, isSameDay, isToday } from 'date-fns';
import { CalendarCheck2Icon, MapPinIcon } from 'lucide-react';
import { appointmentStatuses, vendorAccount } from '../../data/vendorPortal';
import { formatDay, formatTime } from '../../utils/format';
import type { Appointment } from '../../types/vendorPortal';

interface DayAgendaProps {
  days: Date[];
  selected: Date;
  onSelect: (day: Date) => void;
  appointments: Appointment[];
}

export function DayAgenda({ days, selected, onSelect, appointments }: DayAgendaProps) {
  const dayAppts = appointments.
  filter((a) => isSameDay(new Date(a.start), selected)).
  sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Choose a day">
        {days.map((d) => {
          const active = isSameDay(d, selected);
          const today = isToday(d);
          const hasJobs = appointments.some((a) => isSameDay(new Date(a.start), d));
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={active}
              aria-label={format(d, 'EEEE d MMMM')}
              className={`flex flex-col items-center rounded-xl py-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
              active ? 'bg-pine text-white' : today ? 'bg-white text-pine ring-1 ring-pine' : 'bg-white text-ink ring-1 ring-line'}`
              }>
              
              <span className={`text-[11px] font-semibold ${active ? 'text-white/80' : 'text-muted'}`}>{format(d, 'EEE')}</span>
              <span className="text-base font-bold">{format(d, 'd')}</span>
              <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${hasJobs ? active ? 'bg-mustard' : 'bg-clay' : 'bg-transparent'}`} aria-hidden="true" />
            </button>);

        })}
      </div>

      <h3 className="mt-6 text-lg font-extrabold text-ink">
        {formatDay(selected.toISOString())}
        <span className="ml-2 text-sm font-semibold text-muted">{format(selected, 'EEE d MMM')}</span>
      </h3>

      {dayAppts.length > 0 ?
      <ol className="mt-3 space-y-3">
          {dayAppts.map((a) => {
          const status = appointmentStatuses[a.status];
          return (
            <li key={a.id} className="flex gap-3">
                <p className="w-16 shrink-0 pt-3.5 text-sm font-bold text-ink">{formatTime(a.start)}</p>
                <div className="min-w-0 flex-1 rounded-2xl border border-line bg-white p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-ink">{a.service}</p>
                    <span className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold ${status.badgeClass}`}>{status.label}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{a.customerName} · {a.durationHours} hr{a.durationHours === 1 ? '' : 's'}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {a.area}
                  </p>
                </div>
              </li>);

        })}
        </ol> :

      <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
          <CalendarCheck2Icon className="h-7 w-7 text-muted" aria-hidden="true" />
          <p className="mt-3 font-bold text-ink">No jobs booked</p>
          <p className="mt-1 text-sm text-muted">You're open for requests · {vendorAccount.workingHours}</p>
        </div>
      }
    </div>);

}