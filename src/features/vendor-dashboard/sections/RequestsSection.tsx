import { Link } from 'react-router-dom';
import { ArrowLeftRightIcon, InboxIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { vendorAccount } from '../../../data/vendorPortal';
import { JOB_ACTOR } from '../../jobs/constants';
import { NotificationList } from '../../jobs/components/notifications/NotificationList';
import { actionHint } from '../../jobs/utils/actionHints';
import { JobListItem } from '../../jobs/components/JobListItem';
import { DASHBOARD_ROUTES } from '../constants';
import { RequestFilters } from '../components/requests/RequestFilters';
import { useRequestList } from '../hooks/useRequestList';
import { useRequests } from '../hooks/useRequests';

/** Incoming job requests and every job after them, from the shared job service. */
export function RequestsSection() {
  const { jobs, status, error, reload, newCount } = useRequests();
  const list = useRequestList(jobs);

  function renderList() {
    if (status === 'error') return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (status === 'loading' && jobs.length === 0) return <LoadingState label="Loading requests" rows={4} rowClassName="h-32" />;
    if (jobs.length === 0) {
      return <EmptyState icon={InboxIcon} title="No requests yet" description="When customers request a job, it shows up here for you to quote." />;
    }
    if (list.results.length === 0) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title="No requests match"
          description="Try a different name or status."
          action={
          <Button variant="secondary" size="sm" onClick={list.clearFilters}>
              Clear filters
            </Button>
          } />);


    }
    return (
      <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        {list.results.map((job) => {
          const hint = actionHint(job, JOB_ACTOR.Vendor);
          return (
            <li key={job.id}>
              <JobListItem
                job={job}
                to={DASHBOARD_ROUTES.request(job.id)}
                title={job.customerName}
                actionHint={hint}
                highlighted={hint !== null} />

            </li>);

        })}
      </ul>);

  }

  return (
    <>
      <PageHeader
        title="Requests"
        subtitle={`${vendorAccount.businessName} · ${newCount} new`}
        action={
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:hidden">

            <ArrowLeftRightIcon className="h-4 w-4" aria-hidden="true" />
            Customer
          </Link>
        } />

      <PageContainer>
        <div className="mb-5">
          <NotificationList recipient={JOB_ACTOR.Vendor} recipientId={vendorAccount.vendorId} linkFor={DASHBOARD_ROUTES.request} />
        </div>
        <RequestFilters
          query={list.query}
          onQueryChange={list.setQuery}
          status={list.statusFilter}
          onStatusChange={list.setStatusFilter}
          counts={list.counts} />

        <div className="mt-6 flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted" aria-live="polite">
            {list.hasFilters ? `${list.results.length} of ${jobs.length} shown` : 'All requests'}
          </h2>
          {list.hasFilters &&
          <button
            type="button"
            onClick={list.clearFilters}
            className="rounded text-sm font-semibold text-clay-dark hover:text-clay focus:outline-none focus-visible:ring-2 focus-visible:ring-clay/40">

              Clear filters
            </button>
          }
        </div>
        <div className="mt-3">{renderList()}</div>
      </PageContainer>
    </>);

}
