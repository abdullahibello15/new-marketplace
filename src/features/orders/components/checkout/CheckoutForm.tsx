import { FormProvider } from 'react-hook-form';
import { Button } from '../../../../components/ui/Button';
import { Price } from '../../../../components/ui/Price';
import { useCheckoutForm } from '../../hooks/useCheckoutForm';
import { SeparateFulfilmentNote } from '../SeparateFulfilmentNote';
import { CheckoutVendorCard } from './CheckoutVendorCard';
import { DeliveryDetailsFields } from './DeliveryDetailsFields';
import type { Place } from '../../../discovery/types';
import type { CartCheck, CheckoutResult } from '../../types';

interface CheckoutFormProps {
  check: CartCheck;
  places: Place[];
  onChanged: () => void;
  onPlaced: (result: CheckoutResult) => void;
}

/** The checkout form: one card per vendor order, shared delivery details when needed, and the grand total. */
export function CheckoutForm({ check, places, onChanged, onPlaced }: CheckoutFormProps) {
  const c = useCheckoutForm({ check, places, onChanged, onPlaced });
  const { isSubmitting } = c.form.formState;

  return (
    <FormProvider {...c.form}>
      <form onSubmit={c.submit} noValidate aria-label="Checkout" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {c.groups.map((group, index) => {
            const vendor = check.vendors.find((v) => v.vendorId === group.vendorId);
            const totals = c.totals.perVendor.find((t) => t.vendorId === group.vendorId);
            if (!vendor || !totals) return null;
            return <CheckoutVendorCard key={group.vendorId} index={index} group={group} vendor={vendor} totals={totals} deliveryLga={c.deliveryLga} />;
          })}
          {c.anyDelivery && <DeliveryDetailsFields places={places} />}
        </div>

        <aside aria-labelledby="checkout-total-heading" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-line bg-white p-4 lg:p-5">
            <h2 id="checkout-total-heading" className="text-base font-bold text-ink">
              Total to pay
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              {c.groups.map((g) => {
                const t = c.totals.perVendor.find((x) => x.vendorId === g.vendorId);
                return (
                  <div key={g.vendorId} className="flex justify-between gap-3">
                    <dt className="min-w-0 truncate text-muted">{g.vendorName}</dt>
                    <dd>{t && <Price amount={t.total} className="font-semibold text-ink" />}</dd>
                  </div>);

              })}
              <div className="flex justify-between gap-3 border-t border-line pt-2">
                <dt className="font-bold text-ink">Total</dt>
                <dd>
                  <Price amount={c.totals.grandTotal} className="text-lg font-extrabold text-ink" />
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted">Demo only: no payment is taken. You pay each vendor for their own order.</p>
            <Button type="submit" fullWidth loading={isSubmitting} className="mt-4">
              Place {c.groups.length === 1 ? 'order' : `${c.groups.length} orders`}
            </Button>
          </section>
          <SeparateFulfilmentNote vendorCount={c.groups.length} />
        </aside>
      </form>
    </FormProvider>);

}
