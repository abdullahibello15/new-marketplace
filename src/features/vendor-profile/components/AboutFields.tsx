import { useFormContext, useWatch } from 'react-hook-form';
import { FormField } from '../../../components/ui/FormField';
import { bad, field, ok } from '../../../components/vendor/formStyles';
import { BIO_MAX_LENGTH, tradeCategories } from '../../../data/tradeCategories';
import { NAME_MAX } from '../constants';
import type { ProfileFormData, ProfileFormValues } from '../types';

export function AboutFields() {
  const {
    register,
    control,
    formState: { errors }
  } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const trade = useWatch({ control, name: 'tradeCategory' });
  const bioLength = useWatch({ control, name: 'bio' }).trim().length;

  return (
    <div className="grid gap-4">
      <FormField id="profile-name" label="Business name" hint="Shown at the top of your profile and in search results." error={errors.name?.message}>
        {(describedBy) =>
        <input
          id="profile-name"
          autoComplete="organization"
          maxLength={NAME_MAX * 2}
          {...register('name')}
          aria-invalid={Boolean(errors.name)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} ${errors.name ? bad : ok}`} />

        }
      </FormField>

      <FormField id="profile-trade" label="Trade category" error={errors.tradeCategory?.message}>
        {(describedBy) =>
        <select
          id="profile-trade"
          {...register('tradeCategory')}
          aria-invalid={Boolean(errors.tradeCategory)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} ${errors.tradeCategory ? bad : ok}`}>

            <option value="" disabled>
              Choose your trade
            </option>
            {tradeCategories.map((t) =>
          <option key={t.id} value={t.id}>
                {t.label}
              </option>
          )}
          </select>
        }
      </FormField>

      {trade === 'other' &&
      <FormField id="profile-trade-other" label="Your trade" error={errors.tradeCategoryOther?.message}>
          {(describedBy) =>
        <input
          id="profile-trade-other"
          {...register('tradeCategoryOther')}
          placeholder="e.g. Welder, AC technician"
          aria-invalid={Boolean(errors.tradeCategoryOther)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} ${errors.tradeCategoryOther ? bad : ok}`} />

        }
        </FormField>
      }

      <FormField
        id="profile-bio"
        label="Bio (optional)"
        error={errors.bio?.message}
        aside={
        <span className={`text-xs font-semibold tabular-nums ${bioLength > BIO_MAX_LENGTH ? 'text-clay-dark' : 'text-muted'}`}>
            {bioLength}/{BIO_MAX_LENGTH}
          </span>
        }>

        {(describedBy) =>
        <textarea
          id="profile-bio"
          rows={5}
          {...register('bio')}
          placeholder="Tell customers about your experience, the areas you cover and what makes your work stand out."
          aria-invalid={Boolean(errors.bio)}
          aria-describedby={describedBy}
          className={`${field} resize-y ${errors.bio ? bad : ok}`} />

        }
      </FormField>
    </div>);

}
