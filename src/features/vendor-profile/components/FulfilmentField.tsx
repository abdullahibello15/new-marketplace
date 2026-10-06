import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Switch } from '../../../components/Switch';
import { FormField } from '../../../components/ui/FormField';
import { bad, errorText, field, ok } from '../../../components/vendor/formStyles';
import { formatPriceInput } from '../utils/profileForm';
import { ServiceAreasField } from './ServiceAreasField';
import type { ProfileFormData, ProfileFormValues } from '../types';

/** Pickup and delivery for product orders. Only what's switched on is offered at checkout. */
export function FulfilmentField() {
  const {
    control,
    register,
    formState: { errors }
  } = useFormContext<ProfileFormValues, unknown, ProfileFormData>();
  const [pickupOn, deliveryOn] = useWatch({ control, name: ['fulfilment.pickupEnabled', 'fulfilment.deliveryEnabled'] });
  const e = errors.fulfilment;

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-xl border border-line p-4">
        <Controller
          control={control}
          name="fulfilment.pickupEnabled"
          render={({ field: f }) =>
          <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-ink">Pickup</p>
                <p className="text-sm text-muted">Customers collect from your shop or stall.</p>
              </div>
              <Switch checked={f.value} onChange={f.onChange} label="Offer pickup" describedBy={e?.pickupEnabled ? 'fulfilment-toggle-error' : undefined} />
            </div>
          } />

        {pickupOn &&
        <>
            <FormField id="pickup-address" label="Pickup address" hint="For example: “Shop 4, Tunga Market Road, Minna”." error={e?.pickupAddress?.message}>
              {(describedBy) =>
            <input
              id="pickup-address"
              {...register('fulfilment.pickupAddress')}
              aria-invalid={Boolean(e?.pickupAddress)}
              aria-describedby={describedBy}
              className={`${field} ${e?.pickupAddress ? bad : ok}`} />

            }
            </FormField>
            <FormField id="pickup-instructions" label="Pickup instructions (optional)" error={e?.pickupInstructions?.message}>
              {(describedBy) =>
            <textarea
              id="pickup-instructions"
              rows={2}
              {...register('fulfilment.pickupInstructions')}
              placeholder="Opening times, who to ask for, what to bring…"
              aria-invalid={Boolean(e?.pickupInstructions)}
              aria-describedby={describedBy}
              className={`${field} resize-y ${e?.pickupInstructions ? bad : ok}`} />

            }
            </FormField>
          </>
        }
      </div>

      <div className="space-y-4 rounded-xl border border-line p-4">
        <Controller
          control={control}
          name="fulfilment.deliveryEnabled"
          render={({ field: f }) =>
          <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-ink">Delivery</p>
                <p className="text-sm text-muted">You or your rider bring orders to the customer.</p>
              </div>
              <Switch checked={f.value} onChange={f.onChange} label="Offer delivery" describedBy={e?.pickupEnabled ? 'fulfilment-toggle-error' : undefined} />
            </div>
          } />

        {deliveryOn &&
        <>
            <Controller
            control={control}
            name="fulfilment.deliveryFee"
            render={({ field: f }) =>
            <FormField id="delivery-fee" label="Delivery fee per order (₦)" hint="Enter 0 for free delivery." error={e?.deliveryFee?.message}>
                  {(describedBy) =>
              <input
                id="delivery-fee"
                inputMode="numeric"
                value={f.value}
                onChange={(ev) => f.onChange(formatPriceInput(ev.target.value))}
                onBlur={f.onBlur}
                ref={f.ref}
                aria-invalid={Boolean(e?.deliveryFee)}
                aria-describedby={describedBy}
                className={`${field} ${e?.deliveryFee ? bad : ok}`} />

              }
                </FormField>
            } />

            <ServiceAreasField name="fulfilment.deliveryAreas" idPrefix="delivery-areas" label="Add an LGA you deliver to" />
          </>
        }
      </div>

      {e?.pickupEnabled &&
      <p id="fulfilment-toggle-error" role="alert" className={errorText}>
          {e.pickupEnabled.message}
        </p>
      }
    </div>);

}
