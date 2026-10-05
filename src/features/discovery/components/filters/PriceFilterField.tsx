import { useId } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { DualRangeSlider } from '../../../../components/ui/DualRangeSlider';
import { bad, errorText, field, ok } from '../../../../components/vendor/formStyles';
import { formatNumberInput, parseNumberInput } from '../../../../lib/numberInput';
import { formatNaira } from '../../../../utils/format';
import { PRICE_STOPS } from '../../constants';
import { FilterSection } from './FilterSection';
import type { FilterFormData, FilterFormValues } from '../../schemas';

const LAST = PRICE_STOPS.length - 1;

/** Slider position for a typed price: the nearest stop on the inside of the range. */
function stopIndex(value: number | null, side: 'min' | 'max'): number {
  if (value === null || Number.isNaN(value)) return side === 'min' ? 0 : LAST;
  if (side === 'min') {
    const i = PRICE_STOPS.findIndex((s) => s > value);
    return i === -1 ? LAST : Math.max(0, i - 1);
  }
  const i = PRICE_STOPS.findIndex((s) => s >= value);
  return i === -1 ? LAST : i;
}

/** Min/max inputs in ₦ plus a two-thumb slider. Vendors match if any of their prices fall in the range. */
export function PriceFilterField() {
  const uid = useId();
  const {
    control,
    setValue,
    formState: { errors }
  } = useFormContext<FilterFormValues, unknown, FilterFormData>();
  const [minText, maxText] = useWatch({ control, name: ['priceMin', 'priceMax'] });
  const low = stopIndex(parseNumberInput(minText), 'min');
  const high = stopIndex(parseNumberInput(maxText), 'max');

  function onSlide(lo: number, hi: number) {
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    setValue('priceMin', lo === 0 ? '' : formatNumberInput(PRICE_STOPS[lo]), opts);
    setValue('priceMax', hi === LAST ? '' : formatNumberInput(PRICE_STOPS[hi]), opts);
  }

  const inputs = [
  { name: 'priceMin', label: 'Min (₦)', placeholder: 'No min', error: errors.priceMin?.message },
  { name: 'priceMax', label: 'Max (₦)', placeholder: 'No max', error: errors.priceMax?.message }] as
  const;

  return (
    <FilterSection title="Price">
      <div className="grid grid-cols-2 gap-3">
        {inputs.map((input) =>
        <div key={input.name}>
            <label htmlFor={`${uid}-${input.name}`} className="mb-1 block text-xs font-bold text-muted">
              {input.label}
            </label>
            <Controller
            control={control}
            name={input.name}
            render={({ field: f }) =>
            <input
              id={`${uid}-${input.name}`}
              inputMode="numeric"
              autoComplete="off"
              {...f}
              onChange={(e) => f.onChange(formatNumberInput(e.target.value))}
              placeholder={input.placeholder}
              aria-invalid={Boolean(input.error)}
              aria-describedby={input.error ? `${uid}-${input.name}-error` : undefined}
              className={`${field} ${input.error ? bad : ok}`} />

            } />

          </div>
        )}
      </div>
      {inputs.map((input) =>
      input.error &&
      <p key={input.name} id={`${uid}-${input.name}-error`} className={errorText}>
              {input.error}
            </p>

      )}

      <div className="mt-4">
        <DualRangeSlider
          min={0}
          max={LAST}
          low={low}
          high={high}
          onChange={onSlide}
          lowLabel="Minimum price"
          highLabel="Maximum price"
          formatValue={(i, thumb) => thumb === 'low' && i === 0 ? 'No minimum' : thumb === 'high' && i === LAST ? 'No maximum' : formatNaira(PRICE_STOPS[i])} />

        <div className="mt-1 flex justify-between text-xs font-semibold text-muted" aria-hidden="true">
          <span>{formatNaira(PRICE_STOPS[0])}</span>
          <span>{formatNaira(PRICE_STOPS[LAST])}+</span>
        </div>
      </div>
    </FilterSection>);

}
