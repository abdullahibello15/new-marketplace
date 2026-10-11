import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ChevronRightIcon, FileCheck2Icon, LockIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { VerificationBadge } from '../../../components/VerificationBadge';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SearchInput } from '../../../components/ui/SearchInput';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { verificationTiers } from '../../../data/verificationTiers';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { fromDateKey } from '../../../lib/dates';
import { ADMIN_ROUTES, DOCUMENT_TYPE_LABELS, VERIFICATION_STATUS, VERIFICATION_STATUS_META } from '../constants';
import { useAdminSession } from '../hooks/useAdminSession';
import { listApplications } from '../services/verificationService';
import { getProfileCompletenessForAdmin } from '../../vendor-profile/services/profileCompletenessService';
import type { Verification } from '../../../types/marketplace';
import type { VerificationApplication, VerificationStatus } from '../types';

interface Filters {
  status: VerificationStatus | 'open' | 'all';
  tier: Verification | 'all';
  from: string;
  to: string;
  query: string;
  sort: 'oldest' | 'newest';
}

const DEFAULT: Filters = { status: 'open', tier: 'all', from: '', to: '', query: '', sort: 'oldest' };
const OPEN: VerificationStatus[] = [VERIFICATION_STATUS.Pending, VERIFICATION_STATUS.InReview];
const select = `${field} ${ok} py-2.5`;

function matches(a: VerificationApplication, f: Filters): boolean {
  if (f.status === 'open' ? !OPEN.includes(a.status) : f.status !== 'all' && a.status !== f.status) return false;
  if (f.tier !== 'all' && a.requestedTier !== f.tier) return false;
  const at = new Date(a.submittedAt);
  if (f.from && at < fromDateKey(f.from)) return false;
  if (f.to && at > new Date(fromDateKey(f.to).getTime() + 86_399_999)) return false;
  const q = f.query.trim().toLowerCase();
  return !q || [a.vendorName, a.applicantName, a.id].some((s) => s.toLowerCase().includes(q));
}

/** The first ID document's number, masked (lists never show sensitive numbers in full). */
const maskedId = (a: VerificationApplication) => a.documents.find((d) => d.idNumber)?.idNumber ?? null;

/** /admin/verification — vendors waiting for verification, oldest first. */
export function VerificationQueueSection() {
  const { admin } = useAdminSession();
  const { t } = useTranslation('admin');
  const { data, status, error, reload } = useAsyncData(listApplications);
  // Profile completeness (admins only), computed from each vendor's saved profile.
  const loadScores = useCallback(() => getProfileCompletenessForAdmin((data ?? []).map((a) => a.vendorId)), [data]);
  const scores = useAsyncData(loadScores);
  const [f, setF] = useState<Filters>(DEFAULT);
  const set = <K extends keyof Filters,>(k: K, v: Filters[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const rows = useMemo(
    () =>
    (data ?? []).
    filter((a) => matches(a, f)).
    sort((a, b) => f.sort === 'oldest' ? a.submittedAt.localeCompare(b.submittedAt) : b.submittedAt.localeCompare(a.submittedAt)),
    [data, f]
  );
  const openCount = (data ?? []).filter((a) => OPEN.includes(a.status)).length;

  function renderList() {
    if (status === 'error') return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data) return <LoadingState label="Loading the verification queue" rows={5} rowClassName="h-20" />;
    if (rows.length === 0) {
      return data.length === 0 ?
      <EmptyState icon={FileCheck2Icon} title="Nothing to verify" description="New applications show up here as vendors submit documents." /> :

      <EmptyState
        icon={SearchXIcon}
        title="No applications match"
        action={
        <Button variant="secondary" size="sm" onClick={() => setF(DEFAULT)}>
                Clear filters
              </Button>
        } />;


    }
    return (
      <ul className="space-y-2">
        {rows.map((a) => {
          const meta = VERIFICATION_STATUS_META[a.status];
          const reviewer = a.claim && a.claim.adminId !== admin?.id ? a.claim.adminName : a.claim ? 'You' : null;
          return (
            <li key={a.id}>
              <Link
                to={ADMIN_ROUTES.application(a.id)}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-pine/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 sm:flex-row sm:items-center">

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                    {a.vendorName}
                    <Badge tone={meta.tone} dot>{meta.label}</Badge>
                    {a.resubmittedAt && OPEN.includes(a.status) && <Badge tone="info">Resubmitted</Badge>}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {a.applicantName} · {a.id} · submitted {formatDistanceToNowStrict(new Date(a.submittedAt), { addSuffix: true })} ({format(new Date(a.submittedAt), 'd MMM')})
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {a.documents.map((d) => DOCUMENT_TYPE_LABELS[d.type]).join(' · ')}
                    {maskedId(a) && <> · ID <span className="font-mono">{maskedId(a)}</span></>}
                  </p>
                  {scores.data?.[a.vendorId] !== undefined &&
                  <p className="mt-0.5 text-xs text-muted">{t('verification.profileComplete', { percent: scores.data[a.vendorId] })}</p>
                  }
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted">Requests</span>
                  <VerificationBadge verification={a.requestedTier} />
                  {reviewer &&
                  <Badge tone="warning">
                      <LockIcon className="h-3 w-3" aria-hidden="true" /> Reviewing: {reviewer}
                    </Badge>
                  }
                  <ChevronRightIcon className="h-4 w-4 text-muted" aria-hidden="true" />
                </div>
              </Link>
            </li>);

        })}
      </ul>);

  }

  return (
    <>
      <PageHeader title="Verification queue" subtitle={data ? `${openCount} waiting · oldest first` : 'Vendors waiting for verification'} />
      <PageContainer className="space-y-4">
        <section aria-label="Filter applications" className="space-y-3">
          <SearchInput value={f.query} onChange={(v) => set('query', v)} label="Search vendor, applicant or application number" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="vq-status" className={labelClass}>Status</label>
              <select id="vq-status" className={select} value={f.status} onChange={(e) => set('status', e.target.value as Filters['status'])}>
                <option value="open">Waiting (pending + in review)</option>
                <option value="all">All statuses</option>
                {Object.values(VERIFICATION_STATUS).map((s) =>
                <option key={s} value={s}>{VERIFICATION_STATUS_META[s].label}</option>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="vq-tier" className={labelClass}>Tier requested</label>
              <select id="vq-tier" className={select} value={f.tier} onChange={(e) => set('tier', e.target.value as Filters['tier'])}>
                <option value="all">Any tier</option>
                {verificationTiers.filter((t) => t.id !== 'unverified').map((t) =>
                <option key={t.id} value={t.id}>{t.label}</option>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="vq-from" className={labelClass}>Submitted from</label>
              <input id="vq-from" type="date" className={select} value={f.from} max={f.to || undefined} onChange={(e) => set('from', e.target.value)} />
            </div>
            <div>
              <label htmlFor="vq-to" className={labelClass}>Submitted to</label>
              <input id="vq-to" type="date" className={select} value={f.to} min={f.from || undefined} onChange={(e) => set('to', e.target.value)} />
            </div>
            <div>
              <label htmlFor="vq-sort" className={labelClass}>Sort</label>
              <select id="vq-sort" className={select} value={f.sort} onChange={(e) => set('sort', e.target.value as Filters['sort'])}>
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
              </select>
            </div>
          </div>
        </section>
        <p className="text-sm text-muted" aria-live="polite">
          {data ? `${rows.length} of ${data.length} applications` : ''}
        </p>
        {renderList()}
      </PageContainer>
    </>);

}
