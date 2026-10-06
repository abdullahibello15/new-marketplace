import { Price } from '../../../components/ui/Price';
import type { Payable } from '../types';

/** Order summary on the payment screen: what's being paid for, line by line, and the total. */
export function PayableSummary({ payable }: {payable: Payable;}) {
  return (
    <section aria-labelledby="payable-summary-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id="payable-summary-heading" className="text-base font-bold text-ink">
        {payable.title}
      </h2>
      <p className="text-sm text-muted">{payable.vendorName}</p>
      <dl className="mt-3 space-y-1.5 text-sm">
        {payable.lines.map((l) =>
        <div key={l.label} className="flex justify-between gap-3">
            <dt className="min-w-0 text-muted">{l.label}</dt>
            <dd>
              <Price amount={l.amount} className="text-ink" />
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-line pt-2">
          <dt className="font-bold text-ink">Total</dt>
          <dd>
            <Price amount={payable.total} className="text-lg font-extrabold text-ink" />
          </dd>
        </div>
      </dl>
    </section>);

}
