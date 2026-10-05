import React from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { appointmentStatuses } from '../../data/vendorPortal';
import { formatTime } from '../../utils/format';
import type { Appointment } from '../../types/vendorPortal';

const START_HOUR = 8;
const END_HOUR = 18;
const ROW = 60;
const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

interface WeekGridProps {
  days: Date[];
  appointments: Appointment[];
}

export function WeekGrid({ days, appointments }: WeekGridProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-line">
        <div />
        {days.map((d) => {
          const today = isToday(d);
          return (
            <div key={d.toISOString()} className="border-l border-line px-2 py-3 text-center">
              <p className={`text-xs font-semibold ${today ? 'text-pine' : 'text-muted'}`}>{format(d, 'EEE')}</p>
              <p
                className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-base font-bold ${
                today ? 'bg-pine text-white' : 'text-ink'}`
                }>
                
                {format(d, 'd')}
              </p>
            </div>);

        })}
      </div>

      <div className="relative grid grid-cols-[60px_repeat(7,minmax(0,1fr))]" style={{ height: (END_HOUR - START_HOUR) * ROW }}>
        <div className="relative">
          {hours.map((h) =>
          <span key={h} className="absolute right-3 text-[11px] font-medium text-muted" style={{ top: (h - START_HOUR) * ROW + 4 }}>
              {format(new Date(2000, 0, 1, h), 'h a')}
            </span>
          )}
        </div>
        {days.map((d) => {
          const dayAppts = appointments.filter((a) => isSameDay(new Date(a.start), d));
          return (
            <div key={d.toISOString()} className={`relative border-l border-line ${isToday(d) ? 'bg-cream/60' : ''}`}>
              {hours.slice(1).map((h) =>
              <div key={h} aria-hidden="true" className="absolute inset-x-0 border-t border-line/60" style={{ top: (h - START_HOUR) * ROW }} />
              )}
              {dayAppts.map((a) => {
                const start = new Date(a.start);
                const startHour = start.getHours() + start.getMinutes() / 60;
                const top = Math.max(0, (startHour - START_HOUR) * ROW);
                const height = Math.min(a.durationHours, END_HOUR - startHour) * ROW - 4;
                const status = appointmentStatuses[a.status];
                return (
                  <div
                    key={a.id}
                    className={`absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1.5 ${status.blockClass}`}
                    style={{ top: top + 2, height }}
                    title={`${a.service} · ${a.customerName}`}>
                    
                    <p className="truncate text-[11px] font-semibold opacity-80">{formatTime(a.start)}</p>
                    <p className="truncate text-xs font-bold">{a.customerName}</p>
                    {height > 70 && <p className="truncate text-[11px] opacity-80">{a.service}</p>}
                    {height > 100 && <p className="truncate text-[11px] opacity-80">{a.area}</p>}
                  </div>);

              })}
            </div>);

        })}
      </div>
    </div>);

}