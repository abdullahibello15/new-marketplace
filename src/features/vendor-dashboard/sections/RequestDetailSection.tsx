import { Link, useParams } from 'react-router-dom';
import { SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { JOB_STATUS_META } from '../../jobs/constants';
import { JobActivity } from '../../jobs/components/JobActivity';
import { JobDetails } from '../../jobs/components/JobDetails';
import { JobStatusBadge } from '../../jobs/components/JobStatusBadge';
import { JobTimeline } from '../../jobs/components/JobTimeline';
import { MessagesPlaceholder } from '../../jobs/components/MessagesPlaceholder';
import { DASHBOARD_ROUTES } from '../constants';
import { VendorJobPanel } from '../components/requests/VendorJobPanel';
import { useRequests } from '../hooks/useRequests';
import { JobRemindersLine } from '../../reminders/components/JobRemindersLine';

const BACK = { to: DASHBOARD_ROUTES.requests, label: 'Requests' };

/** Vendor's view of one job: what the customer asked for, plus quote/decline or the agreed booking. */
export function RequestDetailSection() {
  const { requestId } = useParams();
  const { jobs, status, error, reload } = useRequests();
  const job = jobs.find((j) => j.id === requestId);

  if (!job) {
    return (
      <>
        <PageHeader title="Request" backTo={BACK} />
        <PageContainer width="narrow">
          {status === 'error' ?
          <ErrorState message={error ?? ''} onRetry={reload} /> :
          status === 'loading' ?
          <LoadingState label="Loading request" rows={1} rowClassName="h-80" /> :

          <EmptyState
            icon={SearchXIcon}
            title="We couldn’t find that request"
            description="It may have been removed, or the link is wrong."
            action={
            <Link to={BACK.to} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                  Back to requests
                </Link>
            } />

          }
        </PageContainer>
      </>);

  }

  return (
    <>
      <PageHeader title={job.customerName} subtitle={`Job #${job.id}${job.serviceName ? ` · ${job.serviceName}` : ''}`} backTo={BACK}>
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.status} />
          <span className="text-sm text-white/85">{JOB_STATUS_META[job.status].description}</span>
        </div>
      </PageHeader>
      <PageContainer className="space-y-5">
        <section aria-label="Progress" className="rounded-2xl border border-line bg-white p-4 lg:p-6">
          <JobTimeline job={job} />
        </section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <JobDetails job={job} />
            <MessagesPlaceholder otherParty={job.customerName} />
          </div>
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start" aria-label="Quote and activity">
            <VendorJobPanel job={job} />
            <JobRemindersLine job={job} viewer="vendor" />
            <JobActivity job={job} viewer="vendor" />
          </aside>
        </div>
      </PageContainer>
    </>);

}
