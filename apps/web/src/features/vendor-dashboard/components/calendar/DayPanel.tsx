import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDate as format } from '../../../../utils/format';
import { CalendarCheckIcon, CalendarOffIcon } from 'lucide-react';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { formatDayHours } from '../../../../utils/workingHours';
import { PROFILE_SECTION, profileSectionHref } from '../../../vendor-profile/constants';
import { DAY_AVAILABILITY } from '../../constants';
import { weekdayOf } from '../../utils/calendar';
import { BookingListItem } from './BookingListItem';
import type { CalendarDay } from '../../types';
import type { WorkingHours } from '../../../../types/marketplace';

interface DayPanelProps {
  day: CalendarDay;
  workingHours: WorkingHours;
  saving: boolean;
  onBlock: (day: CalendarDay) => void;
  onUnblock: (key: string) => void;
}

export function DayPanel({ day, workingHours, saving, onBlock, onUnblock }: DayPanelProps) {
  const { t } = useTranslation('vendor');
  const n = day.bookings.length;
  const canChange = !day.isPast && day.availability !== DAY_AVAILABILITY.Closed;

  return (
    <section aria-labelledby="day-panel-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="day-panel-heading" className="text-lg font-extrabold text-ink">
          {format(day.date, 'EEEE d MMMM')}
        </h2>
        {day.isToday && <Badge tone="success">{t('common:date.today')}</Badge>}
      </div>

      <p className="mt-1 text-sm text-muted">
        {day.availability === DAY_AVAILABILITY.Open && t('calendar.openHours', { hours: formatDayHours(workingHours[weekdayOf(day.date)]) })}
        {day.availability === DAY_AVAILABILITY.Blocked && t('calendar.dayOffText')}
        {day.availability === DAY_AVAILABILITY.Closed &&
        <>
            {t('calendar.outsideYourHours')}{' '}
            <Link to={profileSectionHref(PROFILE_SECTION.Hours)} className="rounded font-semibold text-pine underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
              {t('calendar.changeHours')}
            </Link>
          </>
        }
      </p>

      {canChange && (
      day.availability === DAY_AVAILABILITY.Blocked ?
      <Button variant="secondary" size="sm" icon={CalendarCheckIcon} loading={saving} onClick={() => onUnblock(day.key)} className="mt-4">
            {t('calendar.reopen')}
          </Button> :

      <Button variant="outline" size="sm" icon={CalendarOffIcon} loading={saving} onClick={() => onBlock(day)} className="mt-4">
            {t('calendar.block')}
          </Button>)
      }

      <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">
        {n === 0 ? t('calendar.noBookings') : t('calendar.bookings', { count: n })}
      </h3>
      {n > 0 ?
      <ul className="mt-2 space-y-2">
          {day.bookings.map((b) =>
        <BookingListItem key={b.id} booking={b} />
        )}
        </ul> :

      <p className="mt-1 text-sm text-muted">
          {day.isPast ? t('calendar.nothingPast') : t('calendar.nothingFuture')}
        </p>
      }
    </section>);

}
