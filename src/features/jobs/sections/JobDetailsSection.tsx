import { Link, useParams } from 'react-router-dom';
import { SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { vendorProfilePath } from '../../public-profile/constants';
import { CURRENT_CUSTOMER_ID, JOB_ROUTES, JOB_STATUS_META } from '../constants';
import { JobActivity } from '../components/JobActivity';
import { JobDetails } from '../components/JobDetails';
import { JobStatusBadge } from '../components/JobStatusBadge';
import { JobTimeline } from '../components/JobTimeline';
import { MessagesPlaceholder } from '../components/MessagesPlaceholder';
import { QuoteResponse } from '../components/customer/QuoteResponse';
import { useJob } from '../hooks/useJob';

const BACK = { to: JOB_ROUTES.myJobs, label: 'My Jobs' };

/** Customer's job page: timeline, quote (accept/reject), details, history and messages. */
export function JobDetailsSection() {
  const { jobId = '' } = useParams();
  const { job, notFound, status, error, reload, replace } = useJob(jobId);

  if (status === 'error') {
    return (
      <>
        <PageHeader title={`Job #${jobId}`} backTo={BACK} />
        <PageContainer width="narrow">
          <ErrorState message={error ?? ''} onRetry={reload} />
        </PageContainer>
      </>);

  }
  // A job that isn't this customer's is treated as not found.
  if (notFound || job && job.customerId !== CURRENT_CUSTOMER_ID) {
    return (
      <>
        <PageHeader title="Job not found" backTo={BACK} />
        <PageContainer width="narrow">
          <EmptyState
            icon={SearchXIcon}
            title="We couldn’t find that job"
            action={
            <Link to={JOB_ROUTES.myJobs} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                Back to My Jobs
              </Link>
            } />

        </PageContainer>
      </>);

  }
  if (!job) {
    return (
      <>
        <PageHeader title={`Job #${jobId}`} backTo={BACK} />
        <PageContainer width="narrow">
          <LoadingState label="Loading job" rows={3} rowClassName="h-40" />
        </PageContainer>
      </>);

  }

  return (
    <>
      <PageHeader title={`Job #${job.id}`} subtitle={job.vendorName} backTo={BACK}>
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
            <MessagesPlaceholder otherParty={job.vendorName} />
          </div>
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start" aria-label="Quote and activity">
            {job.quote ?
            <QuoteResponse job={job} onUpdated={replace} /> :

            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
                No quote yet. {job.vendorName} will send one here.
              </p>
            }
            <JobActivity job={job} viewer="customer" />
            <Link to={vendorProfilePath(job.vendorId)} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
              View {job.vendorName}
            </Link>
          </aside>
        </div>
      </PageContainer>
    </>);

}
