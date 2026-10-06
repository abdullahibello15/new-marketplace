import { Link } from 'react-router-dom';
import { ClipboardListIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { CURRENT_CUSTOMER_ID, JOB_ACTOR, JOB_ROUTES } from '../constants';
import { JobListItem } from '../components/JobListItem';
import { JobStatusFilter } from '../components/customer/JobStatusFilter';
import { useMyJobs } from '../hooks/useMyJobs';
import { NotificationList } from '../components/notifications/NotificationList';
import { actionHint } from '../utils/actionHints';
import type { Job } from '../types';

/** What, if anything, the customer needs to do on each job (shared rules in utils/actionHints). */
const hintFor = (job: Job) => actionHint(job, JOB_ACTOR.Customer);

export function MyJobsSection() {
  const m = useMyJobs();
  const waiting = m.jobs.filter((j) => hintFor(j) !== null).length;

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
            actionHint={hintFor(job)}
            highlighted={hintFor(job) !== null} />

          </li>
        )}
      </ul>);

  }

  return (
    <>
      <PageHeader title="My Jobs" subtitle={waiting ? `${waiting} ${waiting === 1 ? 'job needs' : 'jobs need'} your attention` : 'Track your job requests and bookings'} />
      <PageContainer className="space-y-4">
        <NotificationList recipient={JOB_ACTOR.Customer} recipientId={CURRENT_CUSTOMER_ID} linkFor={JOB_ROUTES.job} />
        {m.jobs.length > 0 && <JobStatusFilter value={m.filter} onChange={m.setFilter} counts={m.counts} total={m.jobs.length} />}
        {renderList()}
      </PageContainer>
    </>);

}
