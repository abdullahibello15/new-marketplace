import { useFormContext } from 'react-hook-form';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { PLACE_KIND } from '../../../discovery/constants';
import type { Place } from '../../../discovery/types';
import type { CheckoutFormData, CheckoutFormValues } from '../../schemas';

/**
 * Where to deliver, shared by every vendor order set to Delivery. Same landmark-plus-area format as the
 * job request form, since Minna addresses are landmarks rather than postcodes.
 */
export function DeliveryDetailsFields({ places }: {places: Place[];}) {
  const {
    register,
    formState: { errors }
  } = useFormContext<CheckoutFormValues, unknown, CheckoutFormData>();
  const towns = places.filter((p) => p.kind === PLACE_KIND.Town);
  const lgas = places.filter((p) => p.kind === PLACE_KIND.Lga);

  return (
    <section aria-labelledby="delivery-details-heading" className="space-y-4 rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div>
        <h2 id="delivery-details-heading" className="text-base font-bold text-ink">
          Delivery details
        </h2>
        <p className="mt-0.5 text-sm text-muted">Used for every order you’ve set to delivery. Riders call this number when they’re close.</p>
      </div>
      <FormField
        id="checkout-landmark"
        label="Street or landmark"
        hint="For example: “Behind NEPA office, blue gate” or “House 14, Bosso Estate”."
        error={errors.landmark?.message}>

        {(describedBy) =>
        <input
          id="checkout-landmark"
          autoComplete="street-address"
          {...register('landmark')}
          aria-invalid={Boolean(errors.landmark)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} ${errors.landmark ? bad : ok}`} />

        }
      </FormField>
      <FormField id="checkout-place" label="Town or LGA" error={errors.placeId?.message}>
        {(describedBy) =>
        <select
          id="checkout-place"
          {...register('placeId')}
          aria-invalid={Boolean(errors.placeId)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} ${errors.placeId ? bad : ok}`}>

            <option value="">Choose your area</option>
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
        }
      </FormField>
      <FormField id="checkout-phone" label="Phone number" hint="A Nigerian mobile number, like 0803 555 0142." error={errors.phone?.message}>
        {(describedBy) =>
        <input
          id="checkout-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          {...register('phone')}
          aria-invalid={Boolean(errors.phone)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} ${errors.phone ? bad : ok}`} />

        }
      </FormField>
    </section>);

}
