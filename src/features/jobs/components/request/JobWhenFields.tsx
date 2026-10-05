import { addDays, format, parseISO } from 'date-fns';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormField } from '../../../../components/ui/FormField';
import { bad, errorText, field, ok } from '../../../../components/vendor/formStyles';
import { formatDayHours, weekdayOfDate } from '../../../../utils/workingHours';
import { JOB_BOOKING_WINDOW_DAYS, TIME_WINDOWS } from '../../constants';
import type { JobRequestFormData, JobRequestFormValues } from '../../schemas';
import type { WorkingHours } from '../../../../types/marketplace';

/** Preferred date plus a time window. The hint shows the vendor's hours for the chosen day. */
export function JobWhenFields({ workingHours }: {workingHours: WorkingHours;}) {
  const {
    register,
    control,
    formState: { errors }
  } = useFormContext<JobRequestFormValues, unknown, JobRequestFormData>();
  const date = useWatch({ control, name: 'preferredDate' });
  const day = date ? parseISO(date) : null;
  const hours = day && !Number.isNaN(day.getTime()) ? workingHours[weekdayOfDate(day)] : null;
  const today = new Date();

  return (
    <>
      <FormField
        id="job-date"
        label="Preferred date"
        hint={hours ? `They work ${formatDayHours(hours)} that day.` : undefined}
        error={errors.preferredDate?.message}>

        {(describedBy) =>
        <input
          id="job-date"
          type="date"
          min={format(today, 'yyyy-MM-dd')}
          max={format(addDays(today, JOB_BOOKING_WINDOW_DAYS), 'yyyy-MM-dd')}
          {...register('preferredDate')}
          aria-invalid={Boolean(errors.preferredDate)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} sm:max-w-xs ${errors.preferredDate ? bad : ok}`} />

        }
      </FormField>

      <fieldset aria-describedby={errors.timeWindow ? 'job-window-error' : undefined}>
        <legend className="mb-2 text-sm font-bold text-muted">Time window</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TIME_WINDOWS.map((w) =>
          <label
            key={w.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[15px] font-semibold text-ink has-[:checked]:border-pine has-[:checked]:bg-[#E3EEEC] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine/40">

              <input
              type="radio"
              value={w.id}
              {...register('timeWindow')}
              id={w.id === TIME_WINDOWS[0].id ? 'job-window' : undefined}
              className="h-4 w-4 accent-pine" />

              {w.label}
            </label>
          )}
        </div>
        {errors.timeWindow &&
        <p id="job-window-error" className={errorText}>
            {errors.timeWindow.message}
          </p>
        }
      </fieldset>
    </>);

}
