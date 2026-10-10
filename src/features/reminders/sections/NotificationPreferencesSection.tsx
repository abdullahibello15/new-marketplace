import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/PageHeader';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { useAuth } from '../../auth/hooks/useAuth';
import { JOB_ACTOR } from '../../jobs/constants';
import { NotificationPreferencesForm } from '../components/NotificationPreferencesForm';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import type { JobParty } from '../../jobs/types';

/** Reminder preferences, shared by the customer app (/profile/notifications) and the vendor portal (/pro/notifications). */
export function NotificationPreferencesSection({ party }: {party: JobParty;}) {
  const { t } = useTranslation('jobs');
  const { user } = useAuth();
  const isCustomer = party === JOB_ACTOR.Customer;
  const p = useNotificationPreferences(party, (isCustomer ? user?.id : user?.vendorId) ?? '');

  return (
    <>
      <PageHeader
        title={t('prefs.title')}
        subtitle={isCustomer ? t('prefs.subtitleCustomer') : t('prefs.subtitleVendor')}
        backTo={isCustomer ? { to: '/profile', label: t('common:nav.profile') } : undefined} />

      <PageContainer width="narrow">
        {p.status === 'error' ?
        <ErrorState message={p.error ?? ''} onRetry={p.reload} /> :
        !p.loaded ?
        <LoadingState label={t('prefs.loading')} rows={2} rowClassName="h-40" /> :

        <NotificationPreferencesForm form={p.form} onSubmit={p.save} />
        }
      </PageContainer>
    </>);

}
