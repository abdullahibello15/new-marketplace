import { useRef } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { XIcon } from 'lucide-react';
import { bad, errorText, field as fieldClass, label, ok } from '../../../components/vendor/formStyles';
import { nigerLgas } from '../../../data/nigerLgas';
import type { NigerLga } from '../../../types/marketplace';
import type { ProfileFormData, ProfileFormValues } from '../types';

/** Keeps areas in the same alphabetical order as the master list. */
const sortAreas = (areas: string[]): NigerLga[] => nigerLgas.filter((lga) => areas.includes(lga));

interface ServiceAreasFieldProps {
  /** Which list of LGAs this edits: where you take jobs, or where you deliver product orders. */
  name?: 'serviceAreas' | 'fulfilment.deliveryAreas';
  /** Prefix for element ids, unique per instance on the page. */
  idPrefix?: string;
  label?: string;
}

export function ServiceAreasField({ name = 'serviceAreas', idPrefix = 'profile-areas', label: labelText = 'Add a Local Government Area' }: ServiceAreasFieldProps) {
  const { control } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const { field, fieldState } = useController({ control, name });
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const areas = field.value;
  const available = nigerLgas.filter((lga) => !areas.includes(lga));
  const error = fieldState.error?.message;

  const change = (next: string[]) => field.onChange(sortAreas(next));

  function remove(lga: string) {
    change(areas.filter((a) => a !== lga));
    // The chip's button disappears, so send focus back to the picker.
    selectRef.current?.focus();
  }

  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={`${idPrefix}-add`} className={label}>
          {labelText}
        </label>
        <span className="text-xs font-semibold text-muted">
          {areas.length} of {nigerLgas.length}
        </span>
      </div>
      <select
        id={`${idPrefix}-add`}
        ref={(el) => {
          selectRef.current = el;
          field.ref(el);
        }}
        value=""
        onBlur={field.onBlur}
        disabled={available.length === 0}
        onChange={(e) => e.target.value && change([...areas, e.target.value])}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${idPrefix}-error` : undefined}
        className={`${fieldClass} ${error ? bad : ok} disabled:opacity-60`}>

        <option value="">{available.length ? 'Choose an LGA…' : 'All LGAs selected'}</option>
        {available.map((lga) =>
        <option key={lga} value={lga}>
            {lga}
          </option>
        )}
      </select>
      {error &&
      <p id={`${idPrefix}-error`} className={errorText}>
          {error}
        </p>
      }

      {areas.length > 0 &&
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected areas">
          {areas.map((lga) =>
        <li key={lga} className="inline-flex items-center gap-1 rounded-full bg-sand py-1 pl-3 pr-1 text-sm font-semibold text-ink">
              {lga}
              <button
            type="button"
            onClick={() => remove(lga)}
            aria-label={`Remove ${lga}`}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-line hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

                <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
        )}
        </ul>
      }

      <div className="mt-3 flex gap-4 text-sm font-semibold">
        {available.length > 0 &&
        <button
          type="button"
          onClick={() => change([...nigerLgas])}
          className="rounded text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

            Select all
          </button>
        }
        {areas.length > 0 &&
        <button
          type="button"
          onClick={() => change([])}
          className="rounded text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

            Clear all
          </button>
        }
      </div>
    </>);

}
