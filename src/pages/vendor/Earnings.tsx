import React, { useState } from 'react';
import { format } from 'date-fns';
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { EarningsChart } from '../../components/vendor/EarningsChart';
import { WithdrawCard } from '../../components/vendor/WithdrawCard';
import { earningTransactions, vendorAccount, weeklyEarnings } from '../../data/vendorPortal';
import { formatDay, formatNaira } from '../../utils/format';
import { lastNDays, netAmount } from '../../utils/earnings';

type Range = 'week' | 'weeks';

export function Earnings() {
  const [range, setRange] = useState<Range>('week');

  const daily = lastNDays(earningTransactions);
  const weekTotal = daily.reduce((s, d) => s + d.total, 0);
  const previousWeek = weeklyEarnings[weeklyEarnings.length - 2].total;
  const change = Math.round((weekTotal - previousWeek) / previousWeek * 100);
  const weekly = weeklyEarnings.map((w, i) => ({ ...w, highlight: i === weeklyEarnings.length - 1 }));
  const eightWeekTotal = weeklyEarnings.reduce((s, w) => s + w.total, 0);

  const chartData = range === 'week' ? daily : weekly;
  const headline = range === 'week' ? weekTotal : eightWeekTotal;

  return (
    <>
      <PageHeader title="Earnings" subtitle={`Payouts every Friday to ${vendorAccount.payoutAccount}`} />
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:px-10 lg:py-8">
        <div className="space-y-8">
          <section aria-labelledby="chart-heading" className="rounded-2xl border border-line bg-white p-4 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="chart-heading" className="text-sm font-semibold text-muted">
                  {range === 'week' ? 'Last 7 days' : 'Last 8 weeks'}
                </h2>
                <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">{formatNaira(headline)}</p>
                {range === 'week' &&
                <p className={`mt-1.5 inline-flex items-center gap-1 text-sm font-bold ${change >= 0 ? 'text-pine' : 'text-clay-dark'}`}>
                    {change >= 0 ? <TrendingUpIcon className="h-4 w-4" aria-hidden="true" /> : <TrendingDownIcon className="h-4 w-4" aria-hidden="true" />}
                    {change >= 0 ? '+' : ''}
                    {change}% vs previous week
                  </p>
                }
              </div>
              <div className="flex rounded-xl bg-sand p-1" role="group" aria-label="Chart range">
                {(
                [
                { id: 'week', label: '7 days' },
                { id: 'weeks', label: '8 weeks' }] as
                const).
                map((opt) =>
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={range === opt.id}
                  onClick={() => setRange(opt.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 ${
                  range === opt.id ? 'bg-white text-ink' : 'text-muted hover:text-ink'}`
                  }>
                  
                    {opt.label}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-6">
              <EarningsChart data={chartData} />
            </div>
          </section>

          <section aria-labelledby="tx-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="tx-heading" className="text-xs font-bold uppercase tracking-wider text-muted">Completed jobs</h2>
              <p className="text-xs font-semibold text-muted">{Math.round(vendorAccount.feeRate * 100)}% platform fee</p>
            </div>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {earningTransactions.map((t) =>
              <li key={t.id} className="flex items-center gap-4 px-4 py-3.5 lg:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{t.service}</p>
                    <p className="truncate text-sm text-muted">
                      {t.customerName} · {formatDay(t.date)}
                      <span className="hidden sm:inline">, {format(new Date(t.date), 'h:mm a')}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-ink">{formatNaira(netAmount(t.amount, vendorAccount.feeRate))}</p>
                    <p className="text-xs text-muted">of {formatNaira(t.amount)}</p>
                  </div>
                </li>
              )}
            </ul>
          </section>
        </div>

        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-8 lg:self-start" aria-label="Balance">
          <WithdrawCard />
          <div className="rounded-2xl border border-line bg-white p-4 lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{vendorAccount.tier}</p>
              <span className="rounded-md bg-[#E3EEEC] px-2 py-0.5 text-xs font-bold text-pine">Active</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {formatNaira(vendorAccount.subscriptionPrice)}/month · renews {format(new Date(vendorAccount.renewsOn), 'd MMM')}
            </p>
          </div>
        </aside>
      </div>
    </>);

}