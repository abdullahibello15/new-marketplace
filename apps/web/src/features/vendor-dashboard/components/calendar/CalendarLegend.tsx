import { useTranslation } from 'react-i18next';
const ITEMS = [
{ label: 'calendar.open', swatch: 'bg-white ring-1 ring-line' },
{ label: 'calendar.outsideHours', swatch: 'bg-sand ring-1 ring-line' },
{ label: 'calendar.dayOff', swatch: 'bg-clay-soft ring-1 ring-clay/30' },
{ label: 'calendar.booking', swatch: 'bg-pine rounded-full !h-2 !w-2' }];


export function CalendarLegend() {
  const { t } = useTranslation('vendor');
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted" aria-label={t('calendar.legend')}>
      {ITEMS.map((item) =>
      <li key={item.label} className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded ${item.swatch}`} aria-hidden="true" />
          {t(item.label)}
        </li>
      )}
    </ul>);

}
