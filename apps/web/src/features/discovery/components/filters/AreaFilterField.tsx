import { useTranslation } from 'react-i18next';
import { lgaLabel } from '../../../../i18n/labels';
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

/** Either a distance from the selected place or a set of LGAs. The switch shows which one is in use. */
export function AreaFilterField() {
  const { t } = useTranslation('discovery');
  const uid = useId();
  const { place } = usePlace();
  const modeOptions: SegmentOption<AreaMode>[] = [
  { id: AREA_MODE.Distance, label: t('filters.distance') },
  { id: AREA_MODE.Lga, label: t('filters.lgas') }];

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
  t('filters.servesLga', { lga: lgas.length === 1 ? lgaLabel(lgas[0]) : t('filters.lgasCount', { count: lgas.length }) }) :
  t('filters.chooseLgas') :
  radius === RADIUS_DEFAULT_KM ?
  t('filters.nearbyDefault', { place: placeLabel(place) }) :
  t('filters.within', { km: radius, place: placeLabel(place) });

  return (
    <FilterSection title={t('filters.area')} describedBy={errors.lgas ? errorId : undefined}>
      <Controller
        control={control}
        name="areaMode"
        render={({ field }) => <SegmentedControl label={t('filters.areaBy')} options={modeOptions} value={field.value} onChange={field.onChange} fill />} />

      <p className="mt-2 text-sm font-semibold text-pine" aria-live="polite">
        {summary}
      </p>

      {mode === AREA_MODE.Distance ?
      <div className="mt-3">
          <label htmlFor={`${uid}-radius`} className="sr-only">
            {t('filters.distanceFrom', { place: placeLabel(place) })}
          </label>
          <input
          id={`${uid}-radius`}
          type="range"
          min={RADIUS_MIN_KM}
          max={RADIUS_MAX_KM}
          step={1}
          {...register('radiusKm', { valueAsNumber: true })}
          aria-valuetext={t('filters.kilometres', { km: radius })}
          className="w-full accent-pine" />

          <div className="flex justify-between text-xs font-semibold text-muted" aria-hidden="true">
            <span>{t('filters.km', { km: RADIUS_MIN_KM })}</span>
            <span>{t('filters.km', { km: RADIUS_MAX_KM })}</span>
          </div>
        </div> :

      <div className="mt-3">
          <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-line p-1.5" aria-label={t('filters.lgas')}>
            {nigerLgas.map((lga) =>
          <li key={lga}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink hover:bg-sand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine/40">
                  <input
                type="checkbox"
                value={lga}
                {...register('lgas')}
                aria-invalid={Boolean(errors.lgas)}
                className="h-4 w-4 shrink-0 accent-pine" />

                  {lgaLabel(lga)}
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
