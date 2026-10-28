import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { jobStatusDescription } from '../../../i18n/labels';
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


/** Vendor's view of one job: what the customer asked for, plus quote/decline or the agreed booking. */
export function RequestDetailSection() {
  const { t } = useTranslation('vendor');
  const BACK = { to: DASHBOARD_ROUTES.requests, label: t('request.back') };
  const { requestId } = useParams();
  const { jobs, status, error, reload } = useRequests();
  const job = jobs.find((j) => j.id === requestId);

  if (!job) {
    return (
      <>
        <PageHeader title={t('request.title')} backTo={BACK} />
        <PageContainer width="narrow">
          {status === 'error' ?
          <ErrorState message={error ?? ''} onRetry={reload} /> :
          status === 'loading' ?
          <LoadingState label={t('request.loading')} rows={1} rowClassName="h-80" /> :

          <EmptyState
            icon={SearchXIcon}
            title={t('request.notFoundTitle')}
            description={t('request.notFoundText')}
            action={
            <Link to={BACK.to} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                  {t('request.backToRequests')}
                </Link>
            } />

          }
        </PageContainer>
      </>);

  }

  return (
    <>
      <PageHeader title={job.customerName} subtitle={job.serviceName ? t('request.subtitleService', { id: job.id, service: job.serviceName }) : t('request.subtitle', { id: job.id })} backTo={BACK}>
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.status} />
          <span className="text-sm text-white/85">{jobStatusDescription(job.status, JOB_STATUS_META[job.status].description)}</span>
        </div>
      </PageHeader>
      <PageContainer className="space-y-5">
        <section aria-label={t('request.progress')} className="rounded-2xl border border-line bg-white p-4 lg:p-6">
          <JobTimeline job={job} />
        </section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <JobDetails job={job} />
            <MessagesPlaceholder otherParty={job.customerName} />
          </div>
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start" aria-label={t('request.aside')}>
            <VendorJobPanel job={job} />
            <JobRemindersLine job={job} viewer="vendor" />
            <JobActivity job={job} viewer="vendor" />
          </aside>
        </div>
      </PageContainer>
    </>);

}
