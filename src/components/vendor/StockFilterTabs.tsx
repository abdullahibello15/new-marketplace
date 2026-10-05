import { stockFilters } from '../../data/stockFilters';
import type { StockFilter } from '../../types/marketplace';

interface StockFilterTabsProps {
  value: StockFilter;
  onChange: (next: StockFilter) => void;
  counts: Record<StockFilter, number>;
}

export function StockFilterTabs({ value, onChange, counts }: StockFilterTabsProps) {
  return (
    <div role="group" aria-label="Filter by stock" className="flex w-full rounded-xl bg-sand p-1 sm:w-auto">
      {stockFilters.map((f) => {
        const active = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-pressed={active}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 sm:flex-none sm:px-4 ${
            active ? 'bg-white text-ink' : 'text-muted hover:text-ink'}`
            }>

            {f.label}
            <span className="tabular-nums text-xs font-semibold text-muted">{counts[f.id]}</span>
          </button>);

      })}
    </div>);

}
