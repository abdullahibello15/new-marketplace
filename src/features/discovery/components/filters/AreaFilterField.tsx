import { useId } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { SegmentedControl, type SegmentOption } from '../../../../components/ui/SegmentedControl';
import { errorText } from '../../../../components/vendor/formStyles';
import { nigerLgas } from '../../../../data/nigerLgas';
import { AREA_MODE, RADIUS_DEFAULT_KM, RADIUS_MAX_KM, RADIUS_MIN_KM, placeLabel } from '../../constants';
import { usePlace } from '../../hooks/usePlace';
import { FilterSection } from './FilterSection';
import type { FilterFormData, FilterFormValues } from '../../schemas';
import type { AreaMode } from '../../types';

const MODE_OPTIONS: SegmentOption<AreaMode>[] = [
{ id: AREA_MODE.Distance, label: 'Distance' },
{ id: AREA_MODE.Lga, label: 'LGAs' }];


/** Either a distance from the selected place or a set of LGAs. The switch shows which one is in use. */
export function AreaFilterField() {
  const uid = useId();
  const { place } = usePlace();
  const {
    control,
    register,
    formState: { errors }
  } = useFormContext<FilterFormValues, unknown, FilterFormData>();
  const [mode, radius, lgas] = useWatch({ control, name: ['areaMode', 'radiusKm', 'lgas'] });
  const errorId = `${uid}-lgas-error`;

  const summary =
  mode === AREA_MODE.Lga ?
  lgas.length ?
  `Vendors who serve ${lgas.length === 1 ? lgas[0] : `${lgas.length} LGAs`}` :
  'Choose one or more LGAs' :
  radius === RADIUS_DEFAULT_KM ?
  `Nearby ${placeLabel(place)} (default)` :
  `Within ${radius} km of ${placeLabel(place)}`;

  return (
    <FilterSection title="Area" describedBy={errors.lgas ? errorId : undefined}>
      <Controller
        control={control}
        name="areaMode"
        render={({ field }) => <SegmentedControl label="Filter area by" options={MODE_OPTIONS} value={field.value} onChange={field.onChange} fill />} />

      <p className="mt-2 text-sm font-semibold text-pine" aria-live="polite">
        {summary}
      </p>

      {mode === AREA_MODE.Distance ?
      <div className="mt-3">
          <label htmlFor={`${uid}-radius`} className="sr-only">
            Distance from {placeLabel(place)}
          </label>
          <input
          id={`${uid}-radius`}
          type="range"
          min={RADIUS_MIN_KM}
          max={RADIUS_MAX_KM}
          step={1}
          {...register('radiusKm', { valueAsNumber: true })}
          aria-valuetext={`${radius} kilometres`}
          className="w-full accent-pine" />

          <div className="flex justify-between text-xs font-semibold text-muted" aria-hidden="true">
            <span>{RADIUS_MIN_KM} km</span>
            <span>{RADIUS_MAX_KM} km</span>
          </div>
        </div> :

      <div className="mt-3">
          <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-line p-1.5" aria-label="LGAs">
            {nigerLgas.map((lga) =>
          <li key={lga}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink hover:bg-sand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine/40">
                  <input
                type="checkbox"
                value={lga}
                {...register('lgas')}
                aria-invalid={Boolean(errors.lgas)}
                className="h-4 w-4 shrink-0 accent-pine" />

                  {lga}
                </label>
              </li>
          )}
          </ul>
          {errors.lgas &&
        <p id={errorId} className={errorText}>
              {errors.lgas.message}
            </p>
        }
        </div>
      }
    </FilterSection>);

}
