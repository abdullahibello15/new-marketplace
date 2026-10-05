import { LocateFixedIcon } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Button } from '../../../../components/ui/Button';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
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
        label="Street or landmark"
        hint="For example: “Behind NEPA office, blue gate” or “House 14, Bosso Estate”."
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
        label="Town or LGA"
        hint={placesStatus === 'error' ? 'Couldn’t load the list of areas.' : undefined}
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

              <option value="">{placesStatus === 'loading' ? 'Loading areas…' : 'Choose your area'}</option>
              {towns.length > 0 &&
            <optgroup label="Towns & neighbourhoods">
                  {towns.map((p) =>
              <option key={p.id} value={p.id}>
                      {p.name}, {p.context}
                    </option>
              )}
                </optgroup>
            }
              {lgas.length > 0 &&
            <optgroup label="Local Government Areas">
                  {lgas.map((p) =>
              <option key={p.id} value={p.id}>
                      {p.name} LGA
                    </option>
              )}
                </optgroup>
            }
            </select>
            {placesStatus === 'error' ?
          <Button variant="outline" onClick={onRetryPlaces} className="shrink-0">
                Try again
              </Button> :

          <Button variant="outline" icon={LocateFixedIcon} loading={locating} onClick={onUseLocation} className="shrink-0">
                Use my location
              </Button>
          }
          </div>
        }
      </FormField>
      <p className="-mt-2 text-xs text-muted">“Use my location” is a demo for now and picks a sample spot in Minna.</p>
    </>);

}
