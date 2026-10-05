import { Link } from 'react-router-dom';
import { ClipboardListIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { JOB_ROUTES, JOB_STATUS } from '../constants';
import { JobListItem } from '../components/JobListItem';
import { JobStatusFilter } from '../components/customer/JobStatusFilter';
import { useMyJobs } from '../hooks/useMyJobs';
import { isQuoteExpired } from '../utils/quote';
import type { Job } from '../types';

/** The customer only needs to act on an open quote. */
const needsCustomer = (job: Job) => job.status === JOB_STATUS.Quoted && job.quote !== null && !isQuoteExpired(job.quote);

export function MyJobsSection() {
  const m = useMyJobs();
  const waiting = m.jobs.filter(needsCustomer).length;

  function renderList() {
    if (m.status === 'error') return <ErrorState message={m.error ?? ''} onRetry={m.reload} />;
    if (m.status === 'loading' && m.jobs.length === 0) return <LoadingState label="Loading your jobs" rows={3} rowClassName="h-32" />;
    if (m.jobs.length === 0) {
      return (
        <EmptyState
          icon={ClipboardListIcon}
          title="No jobs yet"
          description="Find a vendor and send a job request. It’ll show up here so you can track it."
          action={
          <Link to="/" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Find a vendor
            </Link>
          } />);


    }
    if (m.visible.length === 0) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title="No jobs with this status"
          action={
          <Button variant="secondary" size="sm" onClick={() => m.setFilter('all')}>
              Show all jobs
            </Button>
          } />);


    }
    return (
      <ul className="grid gap-3 md:grid-cols-2 lg:gap-4">
        {m.visible.map((job) =>
        <li key={job.id}>
            <JobListItem
            job={job}
            to={JOB_ROUTES.job(job.id)}
            title={job.vendorName}
            actionHint={needsCustomer(job) ? 'Quote ready: accept or reject' : null}
            highlighted={needsCustomer(job)} />

          </li>
        )}
      </ul>);

  }

  return (
    <>
      <PageHeader title="My Jobs" subtitle={waiting ? `${waiting} ${waiting === 1 ? 'quote needs' : 'quotes need'} your answer` : 'Track your job requests and bookings'} />
      <PageContainer className="space-y-4">
        {m.jobs.length > 0 && <JobStatusFilter value={m.filter} onChange={m.setFilter} counts={m.counts} total={m.jobs.length} />}
        {renderList()}
      </PageContainer>
    </>);

}
