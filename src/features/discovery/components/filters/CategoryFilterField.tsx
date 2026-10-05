import { useFormContext } from 'react-hook-form';
import { browseCategories } from '../../../../data/tradeCategories';
import { FilterSection } from './FilterSection';
import type { FilterFormData, FilterFormValues } from '../../schemas';

/** Multi-select category chips. Each chip is a real (visually hidden) checkbox. */
export function CategoryFilterField() {
  const { register } = useFormContext<FilterFormValues, unknown, FilterFormData>();
  return (
    <FilterSection title="Category">
      <div className="flex flex-wrap gap-2">
        {browseCategories.map((c) => {
          const Icon = c.icon;
          return (
            <label
              key={c.id}
              className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink transition-colors duration-150 hover:border-pine/40 has-[:checked]:border-pine has-[:checked]:bg-[#E3EEEC] has-[:checked]:text-pine has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine/40">

              <input type="checkbox" value={c.id} {...register('categories')} className="sr-only" />
              <Icon className="h-4 w-4" aria-hidden="true" />
              {c.browseLabel}
            </label>);

        })}
      </div>
    </FilterSection>);

}
