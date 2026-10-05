import { useEffect, useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, parseISO } from 'date-fns';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { formatDayHours, weekdayOfDate } from '../../../../utils/workingHours';
import { JOB_BOOKING_WINDOW_DAYS, REASON_MAX } from '../../constants';
import { makeRescheduleSchema, type RescheduleFormData, type RescheduleFormValues } from '../../schemas';
import type { WorkingHours } from '../../../../types/marketplace';

interface RescheduleDialogProps {
  open: boolean;
  /** The other side's name, e.g. "Bala Plumbing Services". */
  otherParty: string;
  currentStart: string | null;
  workingHours: WorkingHours;
  remaining: number;
  onSubmit: (data: {proposedStart: string;reason: string;}) => Promise<boolean>;
  onClose: () => void;
}

const blank = (): RescheduleFormValues => ({ date: '', time: '', reason: '' });

export function RescheduleDialog({ open, otherParty, currentStart, workingHours, remaining, onSubmit, onClose }: RescheduleDialogProps) {
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<RescheduleFormValues, unknown, RescheduleFormData>({
    resolver: zodResolver(makeRescheduleSchema({ workingHours, currentStart })),
    defaultValues: blank()
  });
  const date = useWatch({ control, name: 'date' });
  const day = date ? parseISO(date) : null;
  const hours = day && !Number.isNaN(day.getTime()) ? workingHours[weekdayOfDate(day)] : null;
  const today = new Date();

  useEffect(() => {
    if (open) reset(blank());
  }, [open, reset]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!isSubmitting}
      title="Request a new time"
      description={`${otherParty} can accept or decline. Until they reply, the current time stands. ${
      remaining === 1 ? 'This is the last reschedule allowed for this job.' : `${remaining} reschedules left for this job.`}`}>

      <form
        onSubmit={handleSubmit(async (data) => {
          const ok = await onSubmit({ proposedStart: new Date(`${data.date}T${data.time}`).toISOString(), reason: data.reason });
          if (ok) onClose();
        })}
        noValidate
        className="space-y-4">

        {currentStart && <p className="rounded-xl bg-sand px-3 py-2 text-sm text-ink">Currently booked: {format(new Date(currentStart), 'EEE d MMM, h:mm a')}</p>}
        <div className="grid grid-cols-2 gap-3">
          <FormField id={id('date')} label="New date" error={errors.date?.message}>
            {(describedBy) =>
            <input
              id={id('date')}
              type="date"
              min={format(today, 'yyyy-MM-dd')}
              max={format(addDays(today, JOB_BOOKING_WINDOW_DAYS), 'yyyy-MM-dd')}
              {...register('date')}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={describedBy}
              className={`${field} ${errors.date ? bad : ok}`} />

            }
          </FormField>
          <FormField
            id={id('time')}
            label="New time"
            hint={hours ? hours.open ? `Open ${formatDayHours(hours)}` : 'Closed that day' : undefined}
            error={errors.time?.message}>

            {(describedBy) =>
            <input
              id={id('time')}
              type="time"
              step={900}
              {...register('time')}
              aria-invalid={Boolean(errors.time)}
              aria-describedby={describedBy}
              className={`${field} ${errors.time ? bad : ok}`} />

            }
          </FormField>
        </div>
        <FormField id={id('reason')} label="Reason" error={errors.reason?.message} hint={`Up to ${REASON_MAX} characters.`}>
          {(describedBy) =>
          <textarea
            id={id('reason')}
            rows={3}
            {...register('reason')}
            placeholder="e.g. I’ll be at work that afternoon."
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={describedBy}
            className={`${field} resize-y ${errors.reason ? bad : ok}`} />

          }
        </FormField>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Send request
          </Button>
        </div>
      </form>
    </Dialog>);

}
