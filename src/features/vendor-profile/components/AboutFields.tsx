import { useTranslation } from 'react-i18next';
import { tradeLabel } from '../../../i18n/labels';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormField } from '../../../components/ui/FormField';
import { bad, field, ok } from '../../../components/vendor/formStyles';
import { BIO_MAX_LENGTH, tradeCategories } from '../../../data/tradeCategories';
import { NAME_MAX } from '../constants';
import type { ProfileFormData, ProfileFormValues } from '../types';

export function AboutFields() {
  const { t } = useTranslation('vendor');
  const {
    register,
    control,
    formState: { errors }
  } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const trade = useWatch({ control, name: 'tradeCategory' });
  const bioLength = useWatch({ control, name: 'bio' }).trim().length;

  return (
    <div className="grid gap-4">
      <FormField id="profile-name" label={t('profile.about.name')} hint={t('profile.about.nameHint')} error={errors.name?.message}>
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

      <FormField id="profile-trade" label={t('profile.about.trade')} error={errors.tradeCategory?.message}>
        {(describedBy) =>
        <select
          id="profile-trade"
          {...register('tradeCategory')}
          aria-invalid={Boolean(errors.tradeCategory)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} ${errors.tradeCategory ? bad : ok}`}>

            <option value="" disabled>
              {t('profile.about.chooseTrade')}
            </option>
            {tradeCategories.map((tc) =>
          <option key={tc.id} value={tc.id}>
                {tradeLabel(tc.id)}
              </option>
          )}
          </select>
        }
      </FormField>

      {trade === 'other' &&
      <FormField id="profile-trade-other" label={t('profile.about.yourTrade')} error={errors.tradeCategoryOther?.message}>
          {(describedBy) =>
        <input
          id="profile-trade-other"
          {...register('tradeCategoryOther')}
          placeholder={t('profile.about.tradePlaceholder')}
          aria-invalid={Boolean(errors.tradeCategoryOther)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} ${errors.tradeCategoryOther ? bad : ok}`} />

        }
        </FormField>
      }

      <FormField
        id="profile-bio"
        label={t('profile.about.bio')}
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
          placeholder={t('profile.about.bioPlaceholder')}
          aria-invalid={Boolean(errors.bio)}
          aria-describedby={describedBy}
          className={`${field} resize-y ${errors.bio ? bad : ok}`} />

        }
      </FormField>
    </div>);

}
