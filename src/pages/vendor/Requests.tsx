import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRightIcon, ArrowRightIcon, CheckCircle2Icon, MapPinIcon, StarIcon, TimerIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { RequestCard } from '../../components/vendor/RequestCard';
import { useVendorPortal } from '../../contexts/VendorPortalContext';
import { appointments, earningTransactions, vendorAccount } from '../../data/vendorPortal';
import { formatDay, formatNaira, formatTime } from '../../utils/format';
import { lastNDays } from '../../utils/earnings';

export function Requests() {
  const { requests, restoreRequest } = useVendorPortal();
  const pending = requests.filter((r) => r.status === 'awaiting_quote');
  const recent = requests.filter((r) => r.status !== 'awaiting_quote');
  const weekTotal = lastNDays(earningTransactions).reduce((s, d) => s + d.total, 0);
  const nextUp = appointments.
  filter((a) => a.status !== 'completed' && new Date(a.start).getTime() + a.durationHours * 3600000 > Date.now()).
  sort((a, b) => a.start.localeCompare(b.start))[0];

  return (
    <>
      <PageHeader
        title={vendorAccount.businessName}
        subtitle="Vendor mode"
        action={
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:hidden">
          
            <ArrowLeftRightIcon className="h-4 w-4" aria-hidden="true" />
            Customer
          </Link>
        }>
        
        <span className="inline-flex rounded-md bg-mustard px-2 py-0.5 text-xs font-bold text-ink">
          Subscription active · {vendorAccount.tier}
        </span>
      </PageHeader>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:px-10 lg:py-8">
        <div className="space-y-6">
          {pending.length > 0 &&
          <div role="status" className="flex items-start gap-2.5 rounded-2xl border border-mustard/60 bg-[#F7EBCB] px-4 py-3.5 text-sm font-semibold text-clay-dark">
              <TimerIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {pending.length} new {pending.length === 1 ? 'request' : 'requests'} — respond within {vendorAccount.slaMinutes} min to keep your fast-response badge
            </div>
          }

          <section aria-labelledby="new-heading">
            <h2 id="new-heading" className="sr-only">New requests</h2>
            {pending.length > 0 ?
            <div className="space-y-3">
                {pending.map((r) =>
              <RequestCard key={r.id} request={r} />
              )}
              </div> :

            <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
                <CheckCircle2Icon className="h-8 w-8 text-pine" aria-hidden="true" />
                <p className="mt-3 font-bold text-ink">You're all caught up</p>
                <p className="mt-1 text-sm text-muted">New job requests will appear here.</p>
              </div>
            }
          </section>

          {recent.length > 0 &&
          <section aria-labelledby="recent-heading">
              <h2 id="recent-heading" className="text-xs font-bold uppercase tracking-wider text-muted">Recent</h2>
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                {recent.map((r) =>
              <li key={r.id} className="flex items-center gap-4 px-4 py-3.5 lg:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">{r.customerName}</p>
                      <p className="truncate text-sm text-muted">{r.description} · {r.area}</p>
                    </div>
                    {r.status === 'quoted' ?
                <div className="text-right">
                        <p className="font-bold text-ink">{r.quote ? formatNaira(r.quote) : ''}</p>
                        <p className="text-xs font-semibold text-muted">Quote sent</p>
                      </div> :

                <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-muted">Declined</span>
                        <button
                    type="button"
                    onClick={() => restoreRequest(r.id)}
                    className="rounded-lg px-2 py-1 text-sm font-bold text-clay-dark transition-colors duration-150 hover:bg-clay-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">
                    
                          Undo
                        </button>
                      </div>
                }
                  </li>
              )}
              </ul>
            </section>
          }
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start" aria-label="Summary">
          <div className="grid grid-cols-2 gap-3">
            <Link to="/pro/earnings" className="rounded-2xl bg-sand px-4 py-3.5 transition-colors duration-150 hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
              <p className="text-2xl font-extrabold tracking-tight text-ink">{formatNaira(weekTotal)}</p>
              <p className="mt-0.5 text-sm font-medium text-muted">Last 7 days</p>
            </Link>
            <div className="rounded-2xl bg-sand px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-ink">
                {vendorAccount.rating}
                <StarIcon className="h-5 w-5 fill-mustard text-mustard" aria-hidden="true" />
              </p>
              <p className="mt-0.5 text-sm font-medium text-muted">Rating · {vendorAccount.jobsCompleted} jobs</p>
            </div>
          </div>

          {nextUp &&
          <div className="rounded-2xl border border-line bg-white p-4 lg:p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Next up</p>
              <p className="mt-2 font-bold text-ink">{nextUp.service}</p>
              <p className="mt-0.5 text-sm text-muted">
                {nextUp.customerName} · {formatDay(nextUp.start)}, {formatTime(nextUp.start)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {nextUp.area}
              </p>
              <Link to="/pro/calendar" className="mt-3 inline-flex items-center gap-1 rounded text-sm font-bold text-pine hover:text-pine-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
                Open calendar
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          }
        </aside>
      </div>
    </>);

}