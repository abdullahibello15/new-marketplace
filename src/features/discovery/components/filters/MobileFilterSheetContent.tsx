import { FormProvider } from 'react-hook-form';
import { Button } from '../../../../components/ui/Button';
import { useFilterForm } from '../../hooks/useFilterForm';
import { FilterFields } from './FilterFields';
import type { SearchFilters } from '../../types';

interface MobileFilterSheetContentProps {
  filters: SearchFilters;
  onApply: (next: SearchFilters) => void;
}

/** Mounted each time the sheet opens, so the draft always starts from the filters in use. */
export function MobileFilterSheetContent({ filters, onApply }: MobileFilterSheetContentProps) {
  const { form, apply, clearDraft } = useFilterForm({ filters, onApply, autoApply: false });

  return (
    <FormProvider {...form}>
      <form onSubmit={apply} noValidate aria-label="Filter results">
        <FilterFields />
        <div className="sticky bottom-0 -mx-5 mt-6 flex items-center justify-between gap-4 border-t border-line bg-white px-5 py-4 lg:-mx-6 lg:px-6">
          <button
            type="button"
            onClick={clearDraft}
            className="rounded text-[15px] font-semibold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

            Clear all
          </button>
          <Button type="submit" className="min-w-[8rem]">
            Apply
          </Button>
        </div>
      </form>
    </FormProvider>);

}
