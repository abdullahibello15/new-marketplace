import { useId } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Trash2Icon } from 'lucide-react';
import { FormField } from '../../../components/ui/FormField';
import { bad, field, ok } from '../../../components/vendor/formStyles';
import { serviceDurations } from '../../../data/vendorPortal';
import { SERVICE_DESCRIPTION_MAX } from '../constants';
import { formatPriceInput } from '../utils/profileForm';
import type { ProfileFormData, ProfileFormValues } from '../types';

interface ServiceFieldsetProps {
  index: number;
  onRemove: () => void;
}

export function ServiceFieldset({ index, onRemove }: ServiceFieldsetProps) {
  const uid = useId();
  const {
    register,
    control,
    formState: { errors }
  } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const e = errors.services?.[index];
  const name = useWatch({ control, name: `services.${index}.name` });
  const title = name.trim() || `Service ${index + 1}`;
  const id = (key: string) => `${uid}-${key}`;

  return (
    <fieldset className="rounded-xl border border-line p-4">
      <legend className="sr-only">{title}</legend>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="truncate font-bold text-ink" aria-hidden="true">{title}</p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-clay-soft hover:text-clay-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

          <Trash2Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <FormField id={id('name')} label="Service name" error={e?.name?.message}>
            {(describedBy) =>
            <input
              id={id('name')}
              {...register(`services.${index}.name`)}
              placeholder="e.g. Toilet cistern repair"
              aria-invalid={Boolean(e?.name)}
              aria-describedby={describedBy}
              className={`${field} ${e?.name ? bad : ok}`} />

            }
          </FormField>
        </div>

        {(['minPrice', 'maxPrice'] as const).map((key) =>
        <FormField key={key} id={id(key)} label={key === 'minPrice' ? 'From (₦)' : 'To (₦)'} error={e?.[key]?.message}>
            {(describedBy) =>
          <Controller
            control={control}
            name={`services.${index}.${key}`}
            render={({ field: f }) =>
            <input
              id={id(key)}
              inputMode="numeric"
              {...f}
              onChange={(ev) => f.onChange(formatPriceInput(ev.target.value))}
              placeholder={key === 'minPrice' ? '2,000' : '15,000'}
              aria-invalid={Boolean(e?.[key])}
              aria-describedby={describedBy}
              className={`${field} ${e?.[key] ? bad : ok}`} />

            } />

          }
          </FormField>
        )}

        <div className="md:col-span-2">
          <FormField id={id('duration')} label="Typical duration" error={e?.duration?.message}>
            {(describedBy) =>
            <select
              id={id('duration')}
              {...register(`services.${index}.duration`)}
              aria-describedby={describedBy}
              className={`${field} ${e?.duration ? bad : ok}`}>

                {serviceDurations.map((d) =>
              <option key={d} value={d}>
                    {d}
                  </option>
              )}
              </select>
            }
          </FormField>
        </div>

        <div className="md:col-span-2">
          <FormField
            id={id('description')}
            label="Short description (optional)"
            hint={`What’s included, e.g. parts, call-out, clean-up. Up to ${SERVICE_DESCRIPTION_MAX} characters.`}
            error={e?.description?.message}>

            {(describedBy) =>
            <textarea
              id={id('description')}
              rows={2}
              {...register(`services.${index}.description`)}
              aria-invalid={Boolean(e?.description)}
              aria-describedby={describedBy}
              className={`${field} resize-y ${e?.description ? bad : ok}`} />

            }
          </FormField>
        </div>
      </div>
    </fieldset>);

}
