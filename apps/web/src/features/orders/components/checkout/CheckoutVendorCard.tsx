import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { MapPinIcon, StoreIcon, TruckIcon } from 'lucide-react';
import { Price } from '../../../../components/ui/Price';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
import { errorText } from '../../../../components/vendor/formStyles';
import { fulfilmentMethodLabel } from '../../../../i18n/labels';
import { FULFILMENT_METHOD, FULFILMENT_METHOD_LABELS } from '../../constants';
import { deliveryBlockedReason, enabledMethods, listAreas } from '../../utils/fulfilment';
import { ItemThumb } from '../ItemThumb';
import type { NigerLga } from '../../../../types/marketplace';
import type { CheckoutFormData, CheckoutFormValues } from '../../schemas';
import type { CartVendorGroup, CheckoutVendor } from '../../types';

interface CheckoutVendorCardProps {
  index: number;
  group: CartVendorGroup;
  vendor: CheckoutVendor;
  totals: {subtotal: number;deliveryFee: number;total: number;};
  /** The chosen delivery area, to warn straight away when this vendor doesn't cover it. */
  deliveryLga: NigerLga | null;
}

/** One vendor's order at checkout: its items, pickup or delivery, what that means, and the order total. */
export function CheckoutVendorCard({ index, group, vendor, totals, deliveryLga }: CheckoutVendorCardProps) {
  const { t } = useTranslation('jobs');
  const { control, formState } = useFormContext<CheckoutFormValues, unknown, CheckoutFormData>();
  const methods = enabledMethods(vendor.fulfilment);
  const { pickup, delivery } = vendor.fulfilment;
  const headingId = `checkout-vendor-${group.vendorId}`;
  const errorId = `${headingId}-error`;
  const fieldError = formState.errors.groups?.[index]?.method?.message;

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 id={headingId} className="flex min-w-0 items-center gap-2 text-base font-bold text-ink">
          <StoreIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate">{group.vendorName}</span>
        </h2>
        <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted">{t('order.checkout.orderN', { n: index + 1 })}</span>
      </div>

      <ul className="mt-3 space-y-2">
        {group.items.map((i) =>
        <li key={i.productId} className="flex items-center gap-3 text-sm">
            <ItemThumb src={i.image} className="h-10 w-10" />
            <span className="min-w-0 flex-1 truncate text-ink">
              {i.quantity} × {i.name}
            </span>
            <Price amount={i.unitPrice * i.quantity} className="shrink-0 font-semibold text-ink" />
          </li>
        )}
      </ul>

      <Controller
        control={control}
        name={`groups.${index}.method`}
        render={({ field }) => {
          const liveProblem = field.value === FULFILMENT_METHOD.Delivery ? deliveryBlockedReason(vendor.fulfilment, vendor.vendorName, deliveryLga) : null;
          const problem = fieldError ?? liveProblem;
          return (
            <div className="mt-4" aria-describedby={problem ? errorId : undefined}>
              <p className="mb-1.5 text-sm font-bold text-muted">{t('order.checkout.how')}</p>
              {methods.length > 1 ?
              <SegmentedControl
                label={t('order.checkout.methodFor', { name: group.vendorName })}
                options={methods.map((m) => ({ id: m, label: fulfilmentMethodLabel(m, FULFILMENT_METHOD_LABELS[m]) }))}
                value={field.value}
                onChange={field.onChange}
                fill /> :


              <p className="rounded-xl bg-sand px-3 py-2 text-sm font-bold text-ink">
                  {t('order.checkout.onlyMethod', { method: fulfilmentMethodLabel(field.value, FULFILMENT_METHOD_LABELS[field.value]) })}
                  <span className="font-normal text-muted">{field.value === FULFILMENT_METHOD.Delivery ? t('order.checkout.noPickup', { name: group.vendorName }) : t('order.checkout.noDelivery', { name: group.vendorName })}</span>
                </p>
              }

              {field.value === FULFILMENT_METHOD.Pickup ?
              <div className="mt-3 flex gap-2 rounded-xl bg-[#E3EEEC] px-3 py-2.5 text-sm text-ink">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
                  <div>
                    <p className="font-bold">{t('order.checkout.collectFrom', { address: pickup.address })}</p>
                    {pickup.instructions && <p className="text-muted">{pickup.instructions}</p>}
                    <p className="mt-1 text-muted">{t('order.checkout.readyTold')}</p>
                  </div>
                </div> :

              <div className="mt-3 flex gap-2 rounded-xl bg-[#E3EEEC] px-3 py-2.5 text-sm text-ink">
                  <TruckIcon className="mt-0.5 h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
                  <div>
                    <p className="font-bold">
                      {t('order.checkout.deliveryFee')} {delivery.fee ? <Price amount={delivery.fee} /> : t('order.checkout.free')}
                    </p>
                    <p className="text-muted">{t('order.checkout.deliversTo', { areas: listAreas(delivery.areas), count: delivery.areas.length })}</p>
                  </div>
                </div>
              }
              {problem &&
              <p id={errorId} role="alert" className={errorText}>
                  {problem}
                </p>
              }
            </div>);

        }} />


      <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">{t('order.checkout.items')}</dt>
          <dd>
            <Price amount={totals.subtotal} className="text-ink" />
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">{t('order.checkout.delivery')}</dt>
          <dd className="text-ink">{totals.deliveryFee ? <Price amount={totals.deliveryFee} /> : t('order.checkout.free')}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-bold text-ink">{t('order.checkout.orderTotal')}</dt>
          <dd>
            <Price amount={totals.total} className="font-extrabold text-ink" />
          </dd>
        </div>
      </dl>
    </section>);

}
