import { useTranslation } from 'react-i18next';
import { LocateFixedIcon } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Button } from '../../../../components/ui/Button';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { lgaLabel } from '../../../../i18n/labels';
import { PLACE_KIND } from '../../../discovery/constants';
import type { AsyncStatus } from '../../../../hooks/useAsyncData';
import type { Place } from '../../../discovery/types';
import type { JobRequestFormData, JobRequestFormValues } from '../../schemas';

interface JobAddressFieldsProps {
  places: Place[];
  placesStatus: AsyncStatus;
  onRetryPlaces: () => void;
  locating: boolean;
  onUseLocation: () => void;
}

/** Landmark-style address: free text plus a town/LGA list. No postcode, which Minna addresses don't use. */
export function JobAddressFields({ places, placesStatus, onRetryPlaces, locating, onUseLocation }: JobAddressFieldsProps) {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors }
  } = useFormContext<JobRequestFormValues, unknown, JobRequestFormData>();
  const towns = places.filter((p) => p.kind === PLACE_KIND.Town);
  const lgas = places.filter((p) => p.kind === PLACE_KIND.Lga);

  return (
    <>
      <FormField
        id="job-landmark"
        label={t('jobs:request.landmark')}
        hint={t('jobs:request.landmarkHint')}
        error={errors.landmark?.message}>

        {(describedBy) =>
        <input
          id="job-landmark"
          autoComplete="street-address"
          {...register('landmark')}
          aria-invalid={Boolean(errors.landmark)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} ${errors.landmark ? bad : ok}`} />

        }
      </FormField>

      <FormField
        id="job-place"
        label={t('jobs:request.place')}
        hint={placesStatus === 'error' ? t('jobs:request.placesFailed') : undefined}
        error={errors.placeId?.message}>

        {(describedBy) =>
        <div className="flex flex-col gap-2 sm:flex-row">
            <select
            id="job-place"
            {...register('placeId')}
            disabled={placesStatus === 'loading' && places.length === 0}
            aria-invalid={Boolean(errors.placeId)}
            aria-required="true"
            aria-describedby={describedBy}
            className={`${field} ${errors.placeId ? bad : ok} disabled:opacity-60`}>

              <option value="">{placesStatus === 'loading' ? t('jobs:request.loadingAreas') : t('jobs:request.chooseArea')}</option>
              {towns.length > 0 &&
            <optgroup label={t('jobs:request.towns')}>
                  {towns.map((p) =>
              <option key={p.id} value={p.id}>
                      {p.name}, {p.context}
                    </option>
              )}
                </optgroup>
            }
              {lgas.length > 0 &&
            <optgroup label={t('jobs:request.lgas')}>
                  {lgas.map((p) =>
              <option key={p.id} value={p.id}>
                      {t('jobs:request.lgaOption', { name: lgaLabel(p.name) })}
                    </option>
              )}
                </optgroup>
            }
            </select>
            {placesStatus === 'error' ?
          <Button variant="outline" onClick={onRetryPlaces} className="shrink-0">
                {t('action.retry')}
              </Button> :

          <Button variant="outline" icon={LocateFixedIcon} loading={locating} onClick={onUseLocation} className="shrink-0">
                {t('jobs:request.useLocation')}
              </Button>
          }
          </div>
        }
      </FormField>
      <p className="-mt-2 text-xs text-muted">{t('jobs:request.locationDemo')}</p>
    </>);

}
