import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInHours, formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangleIcon, ChevronRightIcon, GavelIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { Price } from '../../../components/ui/Price';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { DISPUTE_REASON_LABELS } from '../../jobs/constants';
import { ADMIN_POLICIES } from '../config/policies';
import { ADMIN_ROUTES, DISPUTE_CASE_STATUS, DISPUTE_CASE_STATUS_META } from '../constants';
import { DeadlineBadge } from '../components/DeadlineBadge';
import { listDisputes } from '../services/disputeService';
import type { DisputeCaseStatus, DisputeSummary } from '../types';

type AgeId = (typeof ADMIN_POLICIES.disputeAgeBuckets)[number]['id'];
type AmountId = (typeof ADMIN_POLICIES.disputeAmountBuckets)[number]['id'];

interface Filters {
  status: DisputeCaseStatus | 'unresolved' | 'all';
  type: 'all' | 'job' | 'order';
  age: AgeId | 'all';
  amount: AmountId | 'all';
  overdueOnly: boolean;
  sort: 'oldest' | 'amount';
}

const DEFAULT: Filters = { status: 'unresolved', type: 'all', age: 'all', amount: 'all', overdueOnly: false, sort: 'oldest' };
const select = `${field} ${ok} py-2.5`;

function ageBucket(d: DisputeSummary, now: Date): AgeId {
  const hours = differenceInHours(now, new Date(d.openedAt));
  return ADMIN_POLICIES.disputeAgeBuckets.find((b) => hours < b.maxHours)?.id ?? 'gt3';
}
const amountBucket = (d: DisputeSummary): AmountId => ADMIN_POLICIES.disputeAmountBuckets.find((b) => d.amount <= b.max)?.id ?? 'gt50';

function matches(d: DisputeSummary, f: Filters, now: Date): boolean {
  if (f.status === 'unresolved' ? d.status === DISPUTE_CASE_STATUS.Resolved : f.status !== 'all' && d.status !== f.status) return false;
  if (f.type !== 'all' && d.subject.kind !== f.type) return false;
  if (f.age !== 'all' && ageBucket(d, now) !== f.age) return false;
  if (f.amount !== 'all' && amountBucket(d) !== f.amount) return false;
  return !f.overdueOnly || d.overdue;
}

/** /admin/disputes — every reported problem on jobs and orders, overdue ones flagged. */
export function DisputesSection() {
  const { data, status, error, reload } = useAsyncData(listDisputes);
  const [f, setF] = useState<Filters>(DEFAULT);
  const set = <K extends keyof Filters,>(k: K, v: Filters[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const now = useMemo(() => new Date(), [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(
    () =>
    (data ?? []).
    filter((d) => matches(d, f, now)).
    sort((a, b) => f.sort === 'amount' ? b.amount - a.amount : a.openedAt.localeCompare(b.openedAt)),
    [data, f, now]
  );
  const overdue = (data ?? []).filter((d) => d.overdue).length;
  const unresolved = (data ?? []).filter((d) => d.status !== DISPUTE_CASE_STATUS.Resolved).length;

  function renderList() {
    if (status === 'error') return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data) return <LoadingState label="Loading disputes" rows={5} rowClassName="h-24" />;
    if (rows.length === 0) {
      return data.length === 0 ?
      <EmptyState icon={GavelIcon} title="No disputes" description="Problems reported on jobs and orders show up here." /> :

      <EmptyState
        icon={SearchXIcon}
        title="No disputes match"
        action={
        <Button variant="secondary" size="sm" onClick={() => setF(DEFAULT)}>
                Clear filters
              </Button>
        } />;


    }
    return (
      <ul className="space-y-2">
        {rows.map((d) => {
          const meta = DISPUTE_CASE_STATUS_META[d.status];
          return (
            <li key={d.id}>
              <Link
                to={ADMIN_ROUTES.dispute(d.id)}
                className={`flex flex-col gap-2 rounded-2xl border bg-white p-4 transition-colors hover:border-pine/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 sm:flex-row sm:items-center ${
                d.overdue ? 'border-clay/60' : 'border-line'}`}>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                    {d.title}
                    <Badge tone={meta.tone} dot>{meta.label}</Badge>
                    <Badge tone="neutral">{d.subject.kind === 'job' ? 'Service' : 'Retail'}</Badge>
                    {d.overdue &&
                    <Badge tone="danger">
                        <AlertTriangleIcon className="h-3 w-3" aria-hidden="true" /> Overdue
                      </Badge>
                    }
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {d.customerName} vs {d.vendorName} · {DISPUTE_REASON_LABELS[d.reason]}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Opened {formatDistanceToNowStrict(new Date(d.openedAt), { addSuffix: true })}
                    {d.assignee && ` · ${d.assignee.adminName} mediating`}
                  </p>
                  {d.status !== DISPUTE_CASE_STATUS.Resolved &&
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <DeadlineBadge deadline={d.deadlines.vendor} party="Vendor" now={now} />
                      <DeadlineBadge deadline={d.deadlines.customer} party="Customer" now={now} />
                    </div>
                  }
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <Price amount={d.amount} className="text-lg font-extrabold text-ink" />
                  <ChevronRightIcon className="h-4 w-4 text-muted" aria-hidden="true" />
                </div>
              </Link>
            </li>);

        })}
      </ul>);

  }

  return (
    <>
      <PageHeader title="Disputes" subtitle={data ? `${unresolved} unresolved · ${overdue} overdue` : 'Problems reported on jobs and orders'} />
      <PageContainer className="space-y-4">
        <section aria-label="Filter disputes" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="ds-status" className={labelClass}>Status</label>
            <select id="ds-status" className={select} value={f.status} onChange={(e) => set('status', e.target.value as Filters['status'])}>
              <option value="unresolved">Unresolved</option>
              <option value="all">All</option>
              {Object.values(DISPUTE_CASE_STATUS).map((s) =>
              <option key={s} value={s}>{DISPUTE_CASE_STATUS_META[s].label}</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="ds-type" className={labelClass}>Type</label>
            <select id="ds-type" className={select} value={f.type} onChange={(e) => set('type', e.target.value as Filters['type'])}>
              <option value="all">Services and retail</option>
              <option value="job">Services (jobs)</option>
              <option value="order">Retail (orders)</option>
            </select>
          </div>
          <div>
            <label htmlFor="ds-age" className={labelClass}>Age</label>
            <select id="ds-age" className={select} value={f.age} onChange={(e) => set('age', e.target.value as Filters['age'])}>
              <option value="all">Any age</option>
              {ADMIN_POLICIES.disputeAgeBuckets.map((b) =>
              <option key={b.id} value={b.id}>{b.label}</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="ds-amount" className={labelClass}>Amount</label>
            <select id="ds-amount" className={select} value={f.amount} onChange={(e) => set('amount', e.target.value as Filters['amount'])}>
              <option value="all">Any amount</option>
              {ADMIN_POLICIES.disputeAmountBuckets.map((b) =>
              <option key={b.id} value={b.id}>{b.label}</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="ds-sort" className={labelClass}>Sort</label>
            <select id="ds-sort" className={select} value={f.sort} onChange={(e) => set('sort', e.target.value as Filters['sort'])}>
              <option value="oldest">Oldest first</option>
              <option value="amount">Largest amount</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2 lg:col-span-5">
            <input type="checkbox" className="h-4 w-4 accent-pine" checked={f.overdueOnly} onChange={(e) => set('overdueOnly', e.target.checked)} />
            Only overdue (a party missed their response deadline)
          </label>
        </section>
        {renderList()}
      </PageContainer>
    </>);

}
