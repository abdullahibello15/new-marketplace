import { useEffect, useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, parseISO } from 'date-fns';
import { Button } from '../../../../components/ui/Button';
import { Dialog } from '../../../../components/ui/Dialog';
import { FormField } from '../../../../components/ui/FormField';
import { MONEY_CLASS } from '../../../../components/ui/moneyStyles';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { formatNumberInput } from '../../../../lib/numberInput';
import { formatDayHours, weekdayOfDate } from '../../../../utils/workingHours';
import { JOB_BOOKING_WINDOW_DAYS, QUOTE_DURATIONS, QUOTE_EXPIRY_OPTIONS, QUOTE_INCLUDES_MAX, TIME_WINDOWS } from '../../../jobs/constants';
import { makeQuoteSchema, type QuoteFormData, type QuoteFormValues } from '../../../jobs/schemas';
import type { WorkingHours } from '../../../../types/marketplace';
import type { Job, QuoteInput } from '../../../jobs/types';

interface SendQuoteDialogProps {
  open: boolean;
  job: Job;
  workingHours: WorkingHours;
  /** Resolves true when the quote was sent. */
  onSend: (input: QuoteInput) => Promise<boolean>;
  onClose: () => void;
}

/** Starts from what the customer asked for: their date, at the start of their window (or the vendor's opening). */
function defaults(job: Job, hours: WorkingHours): QuoteFormValues {
  const day = parseISO(job.preferredDate);
  const open = hours[weekdayOfDate(day)];
  const window = TIME_WINDOWS.find((w) => w.id === job.timeWindow);
  const start = window && open.open && window.start > open.opensAt ? window.start : open.opensAt;
  return {
    amount: '',
    includes: '',
    durationHours: String(QUOTE_DURATIONS[1].hours),
    proposedDate: job.preferredDate,
    proposedTime: start,
    expiresInHours: String(QUOTE_EXPIRY_OPTIONS[0].hours)
  };
}

/** Task 51: price (₦), what's included, duration, proposed date/time and expiry. Sending sets the job to Quoted. */
export function SendQuoteDialog({ open, job, workingHours, onSend, onClose }: SendQuoteDialogProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<QuoteFormValues, unknown, QuoteFormData>({
    resolver: zodResolver(makeQuoteSchema({ workingHours })),
    defaultValues: defaults(job, workingHours)
  });
  const [date, includes] = useWatch({ control, name: ['proposedDate', 'includes'] });
  const day = date ? parseISO(date) : null;
  const dayHours = day && !Number.isNaN(day.getTime()) ? workingHours[weekdayOfDate(day)] : null;
  const today = new Date();

  useEffect(() => {
    if (open) reset(defaults(job, workingHours));
  }, [open, job, workingHours, reset]);

  const submit = handleSubmit(async (data) => {
    const sent = await onSend({
      amount: data.amount,
      includes: data.includes,
      durationHours: data.durationHours,
      proposedStart: new Date(`${data.proposedDate}T${data.proposedTime}`).toISOString(),
      expiresInHours: data.expiresInHours
    });
    if (sent) onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!isSubmitting}
      title={`Quote for ${job.customerName}`}
      description="Once sent, the customer can accept or reject it. Accepting books the job at this price and time."
      variant={isDesktop ? 'center' : 'sheet'}>

      <form onSubmit={submit} noValidate className="space-y-4">
        <FormField id={id('amount')} label="Price (₦)" error={errors.amount?.message}>
          {(describedBy) =>
          <Controller
            control={control}
            name="amount"
            render={({ field: f }) =>
            <input
              id={id('amount')}
              inputMode="numeric"
              autoComplete="off"
              {...f}
              onChange={(e) => f.onChange(formatNumberInput(e.target.value))}
              placeholder="15,000"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={describedBy}
              className={`${field} ${MONEY_CLASS} ${errors.amount ? bad : ok}`} />

            } />

          }
        </FormField>

        <FormField
          id={id('includes')}
          label="What’s included"
          error={errors.includes?.message}
          aside={<span className="text-xs font-semibold tabular-nums text-muted">{includes.trim().length}/{QUOTE_INCLUDES_MAX}</span>}>

          {(describedBy) =>
          <textarea
            id={id('includes')}
            rows={3}
            {...register('includes')}
            placeholder="e.g. New washer and tap, labour, clean-up"
            aria-invalid={Boolean(errors.includes)}
            aria-describedby={describedBy}
            className={`${field} resize-y ${errors.includes ? bad : ok}`} />

          }
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id={id('date')} label="Proposed date" error={errors.proposedDate?.message}>
            {(describedBy) =>
            <input
              id={id('date')}
              type="date"
              min={format(today, 'yyyy-MM-dd')}
              max={format(addDays(today, JOB_BOOKING_WINDOW_DAYS), 'yyyy-MM-dd')}
              {...register('proposedDate')}
              aria-invalid={Boolean(errors.proposedDate)}
              aria-describedby={describedBy}
              className={`${field} ${errors.proposedDate ? bad : ok}`} />

            }
          </FormField>
          <FormField
            id={id('time')}
            label="Start time"
            hint={dayHours ? dayHours.open ? `You work ${formatDayHours(dayHours)}` : 'You’re closed that day' : undefined}
            error={errors.proposedTime?.message}>

            {(describedBy) =>
            <input
              id={id('time')}
              type="time"
              step={900}
              {...register('proposedTime')}
              aria-invalid={Boolean(errors.proposedTime)}
              aria-describedby={describedBy}
              className={`${field} ${errors.proposedTime ? bad : ok}`} />

            }
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField id={id('duration')} label="Estimated time" error={errors.durationHours?.message}>
            {(describedBy) =>
            <select id={id('duration')} {...register('durationHours')} aria-describedby={describedBy} className={`${field} ${ok}`}>
                {QUOTE_DURATIONS.map((d) =>
              <option key={d.hours} value={d.hours}>
                    {d.label}
                  </option>
              )}
              </select>
            }
          </FormField>
          <FormField id={id('expiry')} label="Quote expires in" error={errors.expiresInHours?.message}>
            {(describedBy) =>
            <select
              id={id('expiry')}
              {...register('expiresInHours')}
              aria-invalid={Boolean(errors.expiresInHours)}
              aria-describedby={describedBy}
              className={`${field} ${errors.expiresInHours ? bad : ok}`}>

                {QUOTE_EXPIRY_OPTIONS.map((o) =>
              <option key={o.hours} value={o.hours}>
                    {o.label}
                  </option>
              )}
              </select>
            }
          </FormField>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Send quote
          </Button>
        </div>
      </form>
    </Dialog>);

}
