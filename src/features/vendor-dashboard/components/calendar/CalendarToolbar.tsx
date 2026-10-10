import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { SegmentedControl, type SegmentOption } from '../../../../components/ui/SegmentedControl';
import { CALENDAR_VIEW } from '../../constants';
import type { CalendarView } from '../../types';



interface CalendarToolbarProps {
  title: string;
  titleId: string;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarToolbar({ title, titleId, view, onViewChange, onPrevious, onNext, onToday }: CalendarToolbarProps) {
  const { t } = useTranslation('vendor');
  const isMonth = view === CALENDAR_VIEW.Month;
  const viewOptions: SegmentOption<CalendarView>[] = [
  { id: CALENDAR_VIEW.Month, label: t('calendar.month') },
  { id: CALENDAR_VIEW.Week, label: t('calendar.week') }];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={titleId} className="text-lg font-extrabold text-ink" aria-live="polite">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl label={t('calendar.view')} options={viewOptions} value={view} onChange={onViewChange} />
        <Button variant="outline" size="sm" onClick={onToday}>
          {t('common:date.today')}
        </Button>
        <Button variant="outline" size="sm" onClick={onPrevious} aria-label={isMonth ? t('calendar.previousMonth') : t('calendar.previousWeek')} className="px-2.5">
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} aria-label={isMonth ? t('calendar.nextMonth') : t('calendar.nextWeek')} className="px-2.5">
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>);

}
