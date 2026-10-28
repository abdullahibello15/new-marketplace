import type { ReactNode } from 'react';
import { Price } from '../../../components/ui/Price';
import type { InvestorBalances } from '../types';

function Card({ label, children, note }: {label: string;children: ReactNode;note: string;}) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3.5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold text-ink">{children}</p>
      <p className="mt-0.5 text-xs text-muted">{note}</p>
    </div>);

}

/** The five headline figures, all calculated from the ledger. */
export function InvestorOverviewCards({ balances: b }: {balances: InvestorBalances;}) {
  return (
    <section aria-label="Your figures" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Card label="Total invested" note="Your contributions">
        <Price amount={b.invested} />
      </Card>
      <Card label="Dividends accrued" note="Declared so far, after adjustments">
        <Price amount={b.accrued} />
      </Card>
      <Card label="Dividends paid out" note="Sent to your bank">
        <Price amount={b.paidOut} />
      </Card>
      <Card label="Dividends available" note="Accrued, not yet paid out">
        <Price amount={b.available} />
      </Card>
      <Card label="Overall return" note="Dividends accrued ÷ invested">
        <span className="font-mono tabular-nums">{b.returnPercent.toFixed(1)}%</span>
      </Card>
    </section>);

}
