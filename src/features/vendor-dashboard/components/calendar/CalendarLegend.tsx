const ITEMS = [
{ label: 'Open', swatch: 'bg-white ring-1 ring-line' },
{ label: 'Outside working hours', swatch: 'bg-sand ring-1 ring-line' },
{ label: 'Day off', swatch: 'bg-clay-soft ring-1 ring-clay/30' },
{ label: 'Booking', swatch: 'bg-pine rounded-full !h-2 !w-2' }];


export function CalendarLegend() {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted" aria-label="Legend">
      {ITEMS.map((item) =>
      <li key={item.label} className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded ${item.swatch}`} aria-hidden="true" />
          {item.label}
        </li>
      )}
    </ul>);

}
