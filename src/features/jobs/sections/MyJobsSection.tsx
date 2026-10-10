import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ClipboardListIcon, SearchXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { JOB_ACTOR, JOB_ROUTES } from '../constants';
import { useAuth } from '../../auth/hooks/useAuth';
import { JobListItem } from '../components/JobListItem';
import { JobStatusFilter } from '../components/customer/JobStatusFilter';
import { useMyJobs } from '../hooks/useMyJobs';
import { NotificationList } from '../components/notifications/NotificationList';
import { actionHint } from '../utils/actionHints';
import type { Job } from '../types';

/** What, if anything, the customer needs to do on each job (shared rules in utils/actionHints). */
const hintFor = (job: Job) => actionHint(job, JOB_ACTOR.Customer);

export function MyJobsSection() {
  const { t } = useTranslation('jobs');
  const { user } = useAuth();
  const m = useMyJobs();
  const waiting = m.jobs.filter((j) => hintFor(j) !== null).length;

  function renderList() {
    if (m.status === 'error') return <ErrorState message={m.error ?? ''} onRetry={m.reload} />;
    if (m.status === 'loading' && m.jobs.length === 0) return <LoadingState label={t('myJobs.loading')} rows={3} rowClassName="h-32" />;
    if (m.jobs.length === 0) {
      return (
        <EmptyState
          icon={ClipboardListIcon}
          title={t('myJobs.emptyTitle')}
          description={t('myJobs.emptyText')}
          action={
          <Link to="/" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              {t('myJobs.findVendor')}
            </Link>
          } />);


    }
    if (m.visible.length === 0) {
      return (
        <EmptyState
          icon={SearchXIcon}
          title={t('myJobs.noneWithStatus')}
          action={
          <Button variant="secondary" size="sm" onClick={() => m.setFilter('all')}>
              {t('myJobs.showAll')}
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
      <PageHeader title={t('myJobs.title')} subtitle={waiting ? t('myJobs.waiting', { count: waiting }) : t('myJobs.subtitle')} />
      <PageContainer className="space-y-4">
        <NotificationList recipient={JOB_ACTOR.Customer} recipientId={user?.id ?? ''} linkFor={JOB_ROUTES.job} />
        {m.jobs.length > 0 && <JobStatusFilter value={m.filter} onChange={m.setFilter} counts={m.counts} total={m.jobs.length} />}
        {renderList()}
      </PageContainer>
    </>);

}
