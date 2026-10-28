import { useTranslation } from 'react-i18next';
import { weekdayLabel } from '../i18n/labels';
import { OpenStatusBadge } from './OpenStatusBadge';
import { weekdays } from '../data/weekdays';
import { formatDayHours, vendorNow } from '../utils/workingHours';
import type { WorkingHours } from '../types/marketplace';

export function WorkingHoursCard({ hours }: {hours: WorkingHours;}) {
  const { t } = useTranslation();
  const today = vendorNow().day;

  return (
    <section aria-labelledby="hours-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="hours-heading" className="font-bold text-ink">{t('hours.title')}</h2>
        <OpenStatusBadge hours={hours} />
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        {weekdays.map(({ id, label }) => {
          const dayName = weekdayLabel(id, label);
          const isToday = id === today;
          return (
            <div key={id} className={`flex justify-between gap-3 ${isToday ? 'font-bold text-ink' : 'text-muted'}`}>
              <dt>
                {dayName}
                {isToday && <span className="sr-only"> {t('hours.today')}</span>}
              </dt>
              <dd className="tabular-nums">{formatDayHours(hours[id])}</dd>
            </div>);

        })}
      </dl>
      <p className="mt-3 text-xs text-muted">{t('hours.timeZone')}</p>
    </section>);

}
