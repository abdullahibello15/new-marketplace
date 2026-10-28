import { useState } from 'react';
import { addDays, addWeeks, endOfDay, format, isWithinInterval, startOfDay, startOfWeek } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { WeekGrid } from '../../components/vendor/WeekGrid';
import { DayAgenda } from '../../components/vendor/DayAgenda';
import { appointments, appointmentStatuses, vendorAccount } from '../../data/vendorPortal';

export function Calendar() {
  const today = startOfDay(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const [selected, setSelected] = useState(today);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekAppts = appointments.filter((a) =>
  isWithinInterval(new Date(a.start), { start: weekStart, end: endOfDay(days[6]) })
  );
  const upcoming = weekAppts.filter((a) => a.status !== 'completed').length;

  function shiftWeek(n: number) {
    const next = addWeeks(weekStart, n);
    setWeekStart(next);
    setSelected(next);
  }

  function goToday() {
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    setSelected(today);
  }

  const navBtn =
  'flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink transition-colors duration-150 hover:border-ink/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40';

  return (
    <>
      <PageHeader title="Calendar" subtitle={`${weekAppts.length} jobs this week · ${upcoming} still to do`} />
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10 lg:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-ink">
              {format(weekStart, 'd MMM')} – {format(days[6], 'd MMM yyyy')}
            </h2>
            <p className="text-sm text-muted">Working hours · {vendorAccount.workingHours}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={goToday} className="h-9 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink transition-colors duration-150 hover:border-ink/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
              Today
            </button>
            <button type="button" onClick={() => shiftWeek(-1)} className={navBtn} aria-label="Previous week">
              <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => shiftWeek(1)} className={navBtn} aria-label="Next week">
              <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="lg:hidden">
          <DayAgenda days={days} selected={selected} onSelect={setSelected} appointments={weekAppts} />
        </div>

        <div className="hidden lg:block">
          <WeekGrid days={days} appointments={weekAppts} />
          <ul className="mt-4 flex gap-5 text-sm text-muted" aria-label="Legend">
            {Object.entries(appointmentStatuses).map(([key, s]) =>
            <li key={key} className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded ${s.blockClass}`} aria-hidden="true" />
                {s.label}
              </li>
            )}
          </ul>
        </div>
      </div>
    </>);

}