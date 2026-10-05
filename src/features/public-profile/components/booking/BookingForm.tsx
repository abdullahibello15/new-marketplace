import { useId } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { addDays, format, parseISO } from 'date-fns';
import { Button } from '../../../../components/ui/Button';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { formatPriceRange } from '../../../../utils/format';
import { formatDayHours, weekdayOfDate } from '../../../../utils/workingHours';
import { BOOKABLE_ITEM_TYPE, BOOKING_MESSAGE_MAX, BOOKING_WINDOW_DAYS } from '../../constants';
import type { BookingFormData, BookingFormValues } from '../../schemas';
import type { CategoryKind, Vendor } from '../../../../types/marketplace';
import type { BookableItem } from '../../types';

interface BookingFormProps {
  form: UseFormReturn<BookingFormValues, unknown, BookingFormData>;
  onSubmit: () => void;
  onCancel: () => void;
  vendor: Vendor;
  kind: CategoryKind;
  items: BookableItem[];
}

const optionLabel = (i: BookableItem) => `${i.name} · ${formatPriceRange(i.minPrice, i.maxPrice)}`;

export function BookingForm({ form, onSubmit, onCancel, vendor, kind, items }: BookingFormProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const {
    register,
    control,
    formState: { errors, isSubmitting }
  } = form;
  const [date, message] = useWatch({ control, name: ['date', 'message'] });

  const today = new Date();
  const day = date ? parseISO(date) : null;
  const dayHours = day && !Number.isNaN(day.getTime()) ? vendor.workingHours[weekdayOfDate(day)] : null;
  const services = items.filter((i) => i.type === BOOKABLE_ITEM_TYPE.Service);
  const products = items.filter((i) => i.type === BOOKABLE_ITEM_TYPE.Product);
  const messageLength = message.trim().length;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField id={id('item')} label={kind === 'retail' ? 'What would you like?' : 'Which service?'} error={errors.itemId?.message}>
        {(describedBy) =>
        <select
          id={id('item')}
          {...register('itemId')}
          aria-invalid={Boolean(errors.itemId)}
          aria-describedby={describedBy}
          className={`${field} ${errors.itemId ? bad : ok}`}>

            <option value="" disabled>
              Choose one…
            </option>
            {services.length > 0 &&
          <optgroup label="Services">
                {services.map((i) =>
            <option key={i.id} value={i.id}>
                    {optionLabel(i)}
                  </option>
            )}
              </optgroup>
          }
            {products.length > 0 &&
          <optgroup label="Products">
                {products.map((i) =>
            <option key={i.id} value={i.id}>
                    {optionLabel(i)}
                  </option>
            )}
              </optgroup>
          }
          </select>
        }
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id={id('date')} label="Preferred date" error={errors.date?.message}>
          {(describedBy) =>
          <input
            id={id('date')}
            type="date"
            min={format(today, 'yyyy-MM-dd')}
            max={format(addDays(today, BOOKING_WINDOW_DAYS), 'yyyy-MM-dd')}
            {...register('date')}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={describedBy}
            className={`${field} ${errors.date ? bad : ok}`} />

          }
        </FormField>
        <FormField
          id={id('time')}
          label="Preferred time"
          hint={dayHours ? dayHours.open ? `Open ${formatDayHours(dayHours)}` : 'Closed that day' : undefined}
          error={errors.time?.message}>

          {(describedBy) =>
          <input
            id={id('time')}
            type="time"
            step={900}
            min={dayHours?.open ? dayHours.opensAt : undefined}
            max={dayHours?.open ? dayHours.closesAt : undefined}
            {...register('time')}
            aria-invalid={Boolean(errors.time)}
            aria-describedby={describedBy}
            className={`${field} ${errors.time ? bad : ok}`} />

          }
        </FormField>
      </div>

      <FormField
        id={id('message')}
        label="Message"
        error={errors.message?.message}
        aside={
        <span className={`text-xs font-semibold tabular-nums ${messageLength > BOOKING_MESSAGE_MAX ? 'text-clay-dark' : 'text-muted'}`}>
            {messageLength}/{BOOKING_MESSAGE_MAX}
          </span>
        }>

        {(describedBy) =>
        <textarea
          id={id('message')}
          rows={4}
          {...register('message')}
          placeholder={kind === 'retail' ? 'Quantity, delivery address, anything else…' : 'Describe the job, your area and any access details…'}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy}
          className={`${field} resize-y ${errors.message ? bad : ok}`} />

        }
      </FormField>

      <p className="text-sm text-muted">Nothing is booked or paid until {vendor.name} confirms.</p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" loading={isSubmitting}>
          Send request
        </Button>
      </div>
    </form>);

}
