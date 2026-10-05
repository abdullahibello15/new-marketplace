import { FormProvider } from 'react-hook-form';
import { useFilterForm } from '../../hooks/useFilterForm';
import { FilterFields } from './FilterFields';
import type { SearchFilters } from '../../types';

interface DesktopFilterPanelProps {
  filters: SearchFilters;
  activeCount: number;
  onApply: (next: SearchFilters) => void;
  onClearAll: () => void;
}

/** Left column on large screens. Changes apply on their own after a short pause; invalid input waits. */
export function DesktopFilterPanel({ filters, activeCount, onApply, onClearAll }: DesktopFilterPanelProps) {
  const { form, apply } = useFilterForm({ filters, onApply, autoApply: true });

  return (
    <section
      aria-labelledby="desktop-filters-heading"
      className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border border-line bg-white p-5">

      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="desktop-filters-heading" className="text-base font-extrabold text-ink">
          Filters
        </h2>
        {activeCount > 0 &&
        <button
          type="button"
          onClick={onClearAll}
          className="rounded text-sm font-semibold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

            Clear all
          </button>
        }
      </div>
      <FormProvider {...form}>
        <form onSubmit={apply} noValidate aria-label="Filter results">
          <FilterFields />
          <p className="sr-only">Results update as you change filters.</p>
        </form>
      </FormProvider>
    </section>);

}
