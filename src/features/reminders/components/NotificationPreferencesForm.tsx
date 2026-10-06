import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { bad, field, ok } from '../../../components/vendor/formStyles';
import { REMINDER_RULES } from '../config';
import { PreferenceToggle } from './PreferenceToggle';
import type { PreferencesFormData, PreferencesFormValues } from '../schemas';

interface NotificationPreferencesFormProps {
  form: UseFormReturn<PreferencesFormValues, unknown, PreferencesFormData>;
  onSubmit: () => void;
}

const leads = REMINDER_RULES.map((r) => r.lead).join(' and ');

/** Push and SMS toggles, the SMS phone number, and a single switch to opt out of all booking reminders. */
export function NotificationPreferencesForm({ form, onSubmit }: NotificationPreferencesFormProps) {
  const {
    control,
    register,
    formState: { errors, isDirty, isSubmitting }
  } = form;
  const [optedOut, sms] = useWatch({ control, name: ['optedOut', 'sms'] });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Notification preferences" className="space-y-5">
      <section aria-labelledby="reminders-heading" className="rounded-2xl border border-line bg-white px-4 lg:px-5">
        <h2 id="reminders-heading" className="pt-4 text-base font-bold text-ink">
          Booking reminders
        </h2>
        <p className="text-sm text-muted">We remind you {leads} before each booked job. You always see them in Updates in the app.</p>
        <div className="divide-y divide-line">
          <Controller
            control={control}
            name="push"
            render={({ field: f }) =>
            <PreferenceToggle label="Push notifications" description="On your phone, from the Gwani app." checked={f.value} onChange={f.onChange} disabled={optedOut} />
            } />

          <Controller
            control={control}
            name="sms"
            render={({ field: f }) =>
            <PreferenceToggle label="SMS" description="A text message, even without data." checked={f.value} onChange={f.onChange} disabled={optedOut} />
            } />

          <div className="py-4">
            <FormField
              id="pref-phone"
              label={sms && !optedOut ? 'Phone number for SMS' : 'Phone number for SMS (optional)'}
              hint="Nigerian mobile: 0803 555 0142 or +234 803 555 0142."
              error={errors.phone?.message}>

              {(describedBy) =>
              <input
                id="pref-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                {...register('phone')}
                // readOnly rather than disabled, so the saved number is kept while opted out.
                readOnly={optedOut}
                aria-invalid={Boolean(errors.phone)}
                aria-required={sms && !optedOut}
                aria-describedby={describedBy}
                className={`${field} ${errors.phone ? bad : ok} read-only:opacity-60`} />

              }
            </FormField>
          </div>
        </div>
      </section>

      <section aria-labelledby="optout-heading" className="rounded-2xl border border-line bg-white px-4 lg:px-5">
        <h2 id="optout-heading" className="sr-only">
          Opt out
        </h2>
        <Controller
          control={control}
          name="optedOut"
          render={({ field: f }) =>
          <PreferenceToggle
            label="Opt out of all booking reminders"
            description="No reminders by push, SMS or in the app. Other job updates still appear in the app."
            checked={f.value}
            onChange={f.onChange} />

          } />

      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save preferences
        </Button>
      </div>
    </form>);

}
