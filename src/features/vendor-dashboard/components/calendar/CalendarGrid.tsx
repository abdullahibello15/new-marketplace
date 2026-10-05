import React, { useEffect, useRef } from 'react';
import { weekdays } from '../../../../data/weekdays';
import { CalendarDayCell } from './CalendarDayCell';
import type { CalendarDay, CalendarView } from '../../types';

const DAYS_PER_WEEK = 7;

const KEY_DELTAS: Partial<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -DAYS_PER_WEEK,
  ArrowDown: DAYS_PER_WEEK
};

interface CalendarGridProps {
  days: CalendarDay[];
  view: CalendarView;
  selectedKey: string;
  labelledBy: string;
  onSelect: (date: Date) => void;
  onMove: (deltaDays: number) => void;
  onWeekEdge: (edge: 'start' | 'end') => void;
}

/**
 * ARIA grid with one tab stop: arrow keys move between days (and across months or weeks),
 * Home/End jump to the start or end of the week.
 */
export function CalendarGrid({ days, view, selectedKey, labelledBy, onSelect, onMove, onWeekEdge }: CalendarGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const focusAfterMove = useRef(false);

  useEffect(() => {
    if (!focusAfterMove.current) return;
    focusAfterMove.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${selectedKey}"]`)?.focus();
  }, [selectedKey]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const delta = KEY_DELTAS[e.key];
    if (delta !== undefined) onMove(delta);else
    if (e.key === 'Home') onWeekEdge('start');else
    if (e.key === 'End') onWeekEdge('end');else
    return;
    e.preventDefault();
    focusAfterMove.current = true;
  }

  const weeks = Array.from({ length: Math.ceil(days.length / DAYS_PER_WEEK) }, (_, i) =>
  days.slice(i * DAYS_PER_WEEK, (i + 1) * DAYS_PER_WEEK)
  );

  return (
    <div ref={gridRef} role="grid" aria-labelledby={labelledBy} onKeyDown={handleKeyDown}>
      <div role="row" className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {weekdays.map((w) =>
        <div key={w.id} role="columnheader" aria-label={w.label} className="py-1 text-center text-xs font-bold text-muted">
            {w.short}
          </div>
        )}
      </div>
      {weeks.map((week) =>
      <div key={week[0].key} role="row" className="mt-1 grid grid-cols-7 gap-1 sm:mt-1.5 sm:gap-1.5">
          {week.map((day) =>
        <div key={day.key} role="gridcell" aria-selected={day.key === selectedKey}>
              <CalendarDayCell day={day} view={view} selected={day.key === selectedKey} onSelect={onSelect} />
            </div>
        )}
        </div>
      )}
    </div>);

}
