import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { FormField } from '../../../../components/ui/FormField';
import { bad, field, ok } from '../../../../components/vendor/formStyles';
import { lgaLabel } from '../../../../i18n/labels';
import { PLACE_KIND } from '../../../discovery/constants';
import type { Place } from '../../../discovery/types';
import type { CheckoutFormData, CheckoutFormValues } from '../../schemas';

/**
 * Where to deliver, shared by every vendor order set to Delivery. Same landmark-plus-area format as the
 * job request form, since Minna addresses are landmarks rather than postcodes.
 */
export function DeliveryDetailsFields({ places }: {places: Place[];}) {
  const { t } = useTranslation('jobs');
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
          {t('order.checkout.detailsTitle')}
        </h2>
        <p className="mt-0.5 text-sm text-muted">{t('order.checkout.detailsText')}</p>
      </div>
      <FormField
        id="checkout-landmark"
        label={t('request.landmark')}
        hint={t('request.landmarkHint')}
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
      <FormField id="checkout-place" label={t('request.place')} error={errors.placeId?.message}>
        {(describedBy) =>
        <select
          id="checkout-place"
          {...register('placeId')}
          aria-invalid={Boolean(errors.placeId)}
          aria-required="true"
          aria-describedby={describedBy}
          className={`${field} ${errors.placeId ? bad : ok}`}>

            <option value="">{t('request.chooseArea')}</option>
            {towns.length > 0 &&
          <optgroup label={t('request.towns')}>
                {towns.map((p) =>
            <option key={p.id} value={p.id}>
                    {p.name}, {p.context}
                  </option>
            )}
              </optgroup>
          }
            {lgas.length > 0 &&
          <optgroup label={t('request.lgas')}>
                {lgas.map((p) =>
            <option key={p.id} value={p.id}>
                    {t('request.lgaOption', { name: lgaLabel(p.name) })}
                  </option>
            )}
              </optgroup>
          }
          </select>
        }
      </FormField>
      <FormField id="checkout-phone" label={t('order.checkout.phone')} hint={t('order.checkout.phoneHint')} error={errors.phone?.message}>
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
