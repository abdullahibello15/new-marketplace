import React, { useId, useState } from 'react';
import { bad, errorText, field, label, ok } from './formStyles';
import { serviceDurations } from '../../data/vendorPortal';
import type { NewServiceInput } from '../../types/vendorPortal';

interface AddServiceFormProps {
  /** Pre-fills the form to edit an existing service. */
  initial?: NewServiceInput;
  onSave: (input: NewServiceInput) => void;
  onCancel: () => void;
}

type Errors = Partial<Record<'name' | 'minPrice' | 'maxPrice' | 'description', string>>;

const DESCRIPTION_MAX_LENGTH = 120;

function toNumber(v: string): number {
  return Number(v.replace(/[^\d]/g, ''));
}

function formatInput(v: string): string {
  const n = toNumber(v);
  return n ? n.toLocaleString('en-NG') : '';
}

export function AddServiceForm({ initial, onSave, onCancel }: AddServiceFormProps) {
  const uid = useId();
  const [name, setName] = useState(initial?.name ?? '');
  const [minPrice, setMinPrice] = useState(initial ? formatInput(String(initial.minPrice)) : '');
  const [maxPrice, setMaxPrice] = useState(initial ? formatInput(String(initial.maxPrice)) : '');
  const [duration, setDuration] = useState(initial?.duration ?? serviceDurations[1]);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const descriptionLength = description.trim().length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const min = toNumber(minPrice);
    const max = toNumber(maxPrice);
    const next: Errors = {};
    if (!name.trim()) next.name = 'Give the service a name.';
    if (!min) next.minPrice = 'Add a starting price.';
    if (!max) next.maxPrice = 'Add a top price.';else
    if (min && max < min) next.maxPrice = 'The top price can’t be less than the starting price.';
    if (descriptionLength > DESCRIPTION_MAX_LENGTH) next.description = `Keep the description to ${DESCRIPTION_MAX_LENGTH} characters.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({ name: name.trim(), minPrice: min, maxPrice: max, duration, description: description.trim() || undefined });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-line bg-white p-4 lg:p-5"
      aria-label={initial ? `Edit ${initial.name}` : 'New service'}>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor={`${uid}-name`} className={label}>Service name</label>
          <input
            id={`${uid}-name`}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Toilet cistern repair"
            aria-invalid={Boolean(errors.name)}
            className={`${field} ${errors.name ? bad : ok}`} />

          {errors.name && <p className={errorText}>{errors.name}</p>}
        </div>
        <div>
          <label htmlFor={`${uid}-min`} className={label}>From (₦)</label>
          <input
            id={`${uid}-min`}
            inputMode="numeric"
            value={minPrice}
            onChange={(e) => setMinPrice(formatInput(e.target.value))}
            placeholder="2,000"
            aria-invalid={Boolean(errors.minPrice)}
            className={`${field} ${errors.minPrice ? bad : ok}`} />

          {errors.minPrice && <p className={errorText}>{errors.minPrice}</p>}
        </div>
        <div>
          <label htmlFor={`${uid}-max`} className={label}>To (₦)</label>
          <input
            id={`${uid}-max`}
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(formatInput(e.target.value))}
            placeholder="15,000"
            aria-invalid={Boolean(errors.maxPrice)}
            className={`${field} ${errors.maxPrice ? bad : ok}`} />

          {errors.maxPrice && <p className={errorText}>{errors.maxPrice}</p>}
        </div>
        <div className="md:col-span-2">
          <label htmlFor={`${uid}-duration`} className={label}>Typical duration</label>
          <select id={`${uid}-duration`} value={duration} onChange={(e) => setDuration(e.target.value)} className={`${field} ${ok}`}>
            {serviceDurations.map((d) =>
            <option key={d} value={d}>{d}</option>
            )}
          </select>
        </div>
        <div className="md:col-span-2">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor={`${uid}-description`} className="block text-sm font-bold text-muted">
              Short description <span className="font-medium">(optional)</span>
            </label>
            <span
              id={`${uid}-description-count`}
              className={`text-xs font-semibold tabular-nums ${
              descriptionLength > DESCRIPTION_MAX_LENGTH ? 'text-clay-dark' : 'text-muted'}`
              }>

              {descriptionLength}/{DESCRIPTION_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id={`${uid}-description`}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's included, e.g. parts, call-out, clean-up"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={`${uid}-description-count`}
            className={`${field} resize-y ${errors.description ? bad : ok}`} />

          {errors.description && <p className={errorText}>{errors.description}</p>}
        </div>
      </div>
      <div className="mt-5 flex gap-3 md:justify-end">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-sand px-5 py-3 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-line md:flex-none">
          Cancel
        </button>
        <button type="submit" className="flex-1 rounded-xl bg-pine-deep px-5 py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-pine md:flex-none">
          {initial ? 'Save changes' : 'Save service'}
        </button>
      </div>
    </form>);

}
