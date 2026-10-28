import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { vendorProfilePath } from '../../public-profile/constants';
import { jobStatusDescription } from '../../../i18n/labels';
import { JOB_ROUTES, JOB_STATUS_META } from '../constants';
import { useAuth } from '../../auth/hooks/useAuth';
import { JobActivity } from '../components/JobActivity';
import { JobDetails } from '../components/JobDetails';
import { JobStatusBadge } from '../components/JobStatusBadge';
import { JobTimeline } from '../components/JobTimeline';
import { MessagesPlaceholder } from '../components/MessagesPlaceholder';
import { CustomerJobPanel } from '../components/customer/CustomerJobPanel';
import { useJob } from '../hooks/useJob';
import { JobRemindersLine } from '../../reminders/components/JobRemindersLine';


/** Customer's job page: timeline, quote (accept/reject), details, history and messages. */
export function JobDetailsSection() {
  const { t } = useTranslation('jobs');
  const BACK = { to: JOB_ROUTES.myJobs, label: t('page.back') };
  const { user } = useAuth();
  const { jobId = '' } = useParams();
  const { job, notFound, status, error, reload, replace } = useJob(jobId);

  if (status === 'error') {
    return (
      <>
        <PageHeader title={t('page.title', { id: jobId })} backTo={BACK} />
        <PageContainer width="narrow">
          <ErrorState message={error ?? ''} onRetry={reload} />
        </PageContainer>
      </>);

  }
  // A job that isn't this customer's is treated as not found.
  if (notFound || job && job.customerId !== user?.id) {
    return (
      <>
        <PageHeader title={t('page.notFoundTitle')} backTo={BACK} />
        <PageContainer width="narrow">
          <EmptyState
            icon={SearchXIcon}
            title={t('page.notFoundHeading')}
            action={
            <Link to={JOB_ROUTES.myJobs} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                {t('page.backToMyJobs')}
              </Link>
            } />

        </PageContainer>
      </>);

  }
  if (!job) {
    return (
      <>
        <PageHeader title={t('page.title', { id: jobId })} backTo={BACK} />
        <PageContainer width="narrow">
          <LoadingState label={t('page.loading')} rows={3} rowClassName="h-40" />
        </PageContainer>
      </>);

  }

  return (
    <>
      <PageHeader title={t('page.title', { id: job.id })} subtitle={job.vendorName} backTo={BACK}>
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.status} />
          <span className="text-sm text-white/85">{jobStatusDescription(job.status, JOB_STATUS_META[job.status].description)}</span>
        </div>
      </PageHeader>
      <PageContainer className="space-y-5">
        <section aria-label={t('page.progress')} className="rounded-2xl border border-line bg-white p-4 lg:p-6">
          <JobTimeline job={job} />
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <JobDetails job={job} />
            <MessagesPlaceholder otherParty={job.vendorName} />
          </div>
          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start" aria-label={t('page.aside')}>
            <CustomerJobPanel job={job} onUpdated={replace} />
            <JobRemindersLine job={job} viewer="customer" />
            <JobActivity job={job} viewer="customer" />
            <Link to={vendorProfilePath(job.vendorId)} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>
              {t('page.viewVendor', { name: job.vendorName })}
            </Link>
          </aside>
        </div>
      </PageContainer>
    </>);

}
