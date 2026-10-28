export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  count?: number;
  /** Accessible name when the visible label is terse, e.g. "5★" → "5 stars". */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  /** Names the group for screen readers, e.g. "Filter by status". */
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Stretch segments to fill the row instead of scrolling. */
  fill?: boolean;
}

/** Toggle-button group for filters and view switches. Scrolls sideways on narrow screens if it has to. */
export function SegmentedControl<T extends string>({ label, options, value, onChange, fill = false }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className={`max-w-full overflow-x-auto ${fill ? 'w-full' : ''}`}>
      <div className={`flex rounded-xl bg-sand p-1 ${fill ? 'w-full' : 'w-max'}`}>
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              aria-label={o.ariaLabel ? `${o.ariaLabel}${o.count === undefined ? '' : `, ${o.count}`}` : undefined}
              className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pine/40 ${
              fill ? 'flex-1' : ''} ${
              active ? 'bg-white text-ink' : 'text-muted hover:text-ink'}`}>

              {o.label}
              {o.count !== undefined && <span className="text-xs font-semibold tabular-nums text-muted">{o.count}</span>}
            </button>);

        })}
      </div>
    </div>);

}
