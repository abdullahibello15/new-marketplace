import { useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { CopyIcon } from 'lucide-react';
import { Switch } from '../../../components/Switch';
import { bad, errorText, ok } from '../../../components/vendor/formStyles';
import { weekdays } from '../../../data/weekdays';
import type { DayHours, Weekday, WorkingHours } from '../../../types/marketplace';
import type { ProfileFormData, ProfileFormValues } from '../types';

const timeField = 'rounded-xl border bg-white px-3 py-2 text-[15px] tabular-nums text-ink focus:outline-none focus:ring-2';

export function WorkingHoursField() {
  const {
    control,
    formState: { errors }
  } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const { field } = useController({ control, name: 'workingHours' });
  const hours: WorkingHours = field.value;
  const [copySource, setCopySource] = useState<Weekday>('mon');
  const [notice, setNotice] = useState('');

  function setDay(day: Weekday, patch: Partial<DayHours>) {
    field.onChange({ ...hours, [day]: { ...hours[day], ...patch } });
    setNotice('');
  }

  function copyToAll() {
    const label = weekdays.find((d) => d.id === copySource)?.label;
    field.onChange(Object.fromEntries(weekdays.map(({ id }) => [id, { ...hours[copySource] }])) as WorkingHours);
    setNotice(`Copied ${label}’s hours to every day.`);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-sand px-3 py-2.5 text-sm font-semibold text-ink">
        <CopyIcon className="h-4 w-4 text-muted" aria-hidden="true" />
        <span aria-hidden="true">Copy</span>
        <select
          aria-label="Day to copy hours from"
          value={copySource}
          onChange={(e) => setCopySource(e.target.value as Weekday)}
          className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-semibold text-ink focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20">

          {weekdays.map((d) =>
          <option key={d.id} value={d.id}>
              {d.label}
            </option>
          )}
        </select>
        <span aria-hidden="true">’s hours to every day</span>
        <button
          type="button"
          onClick={copyToAll}
          aria-label="Copy these hours to every day"
          className="ml-auto rounded-lg bg-white px-3 py-1.5 font-bold text-ink transition-colors duration-150 hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

          Copy
        </button>
      </div>

      <ul className="divide-y divide-line">
        {weekdays.map(({ id, label }) => {
          const day = hours[id];
          const error = errors.workingHours?.[id]?.message;
          const errorId = `hours-${id}-error`;
          return (
            <li key={id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex w-36 items-center gap-3">
                  <Switch checked={day.open} onChange={(open) => setDay(id, { open })} label={`Open on ${label}`} />
                  <span className="font-bold text-ink">{label}</span>
                </div>
                {day.open ?
                <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`hours-${id}-open`}>
                      {label} opening time
                    </label>
                    <input
                    id={`hours-${id}-open`}
                    type="time"
                    step={900}
                    value={day.opensAt}
                    onChange={(e) => setDay(id, { opensAt: e.target.value })}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className={`${timeField} ${error ? bad : ok}`} />

                    <span className="text-sm font-semibold text-muted" aria-hidden="true">
                      to
                    </span>
                    <label className="sr-only" htmlFor={`hours-${id}-close`}>
                      {label} closing time
                    </label>
                    <input
                    id={`hours-${id}-close`}
                    type="time"
                    step={900}
                    value={day.closesAt}
                    onChange={(e) => setDay(id, { closesAt: e.target.value })}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className={`${timeField} ${error ? bad : ok}`} />

                  </div> :

                <span className="text-sm font-semibold text-muted">Closed</span>
                }
              </div>
              {error &&
              <p id={errorId} className={errorText}>
                  {error}
                </p>
              }
            </li>);

        })}
      </ul>
      <p aria-live="polite" className="mt-3 text-sm font-semibold text-pine empty:hidden">
        {notice}
      </p>
    </>);

}
