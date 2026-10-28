import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { JOB_DESCRIPTION_MAX, JOB_DESCRIPTION_MIN } from '../../constants';
import type { JobRequestFormData, JobRequestFormValues } from '../../schemas';
import type { ServiceItem } from '../../../../types/vendorPortal';

export function JobDescriptionFields({ services }: {services: ServiceItem[];}) {
  const { t } = useTranslation('jobs');
  const {
    register,
    control,
    formState: { errors }
  } = useFormContext<JobRequestFormValues, unknown, JobRequestFormData>();
  const length = useWatch({ control, name: 'description' }).trim().length;
  const short = length > 0 && length < JOB_DESCRIPTION_MIN;

  return (
    <>
      {services.length > 0 &&
      <FormField id="job-service" label={t('request.service')} hint={t('request.serviceHint')}>
          {(describedBy) =>
        <select id="job-service" {...register('serviceName')} aria-describedby={describedBy} className={`${field} ${ok}`}>
              <option value="">{t('request.notSure')}</option>
              {services.map((s) =>
          <option key={s.id} value={s.name}>
                  {s.name}
                </option>
          )}
            </select>
        }
        </FormField>
      }

      <FormField
        id="job-description"
        label={t('request.describe')}
        hint={t('request.describeHint')}
        error={errors.description?.message}
        aside={
        <span className={`text-xs font-semibold tabular-nums ${short || length > JOB_DESCRIPTION_MAX ? 'text-clay-dark' : 'text-muted'}`}>
            {length < JOB_DESCRIPTION_MIN ? t('request.minCount', { n: length, min: JOB_DESCRIPTION_MIN }) : `${length}/${JOB_DESCRIPTION_MAX}`}
          </span>
        }>

        {(describedBy) =>
        <textarea
          id="job-description"
          rows={5}
          {...register('description')}
          aria-invalid={Boolean(errors.description)}
          aria-required="true"
          aria-describedby={describedBy}
          placeholder={t('request.descriptionPlaceholder')}
          className={`${field} resize-y ${errors.description ? bad : ok}`} />

        }
      </FormField>
    </>);

}
