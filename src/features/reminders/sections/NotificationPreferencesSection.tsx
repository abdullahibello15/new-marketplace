import { PageHeader } from '../../../components/PageHeader';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { vendorAccount } from '../../../data/vendorPortal';
import { CURRENT_CUSTOMER_ID, JOB_ACTOR } from '../../jobs/constants';
import { NotificationPreferencesForm } from '../components/NotificationPreferencesForm';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import type { JobParty } from '../../jobs/types';

/** Reminder preferences, shared by the customer app (/profile/notifications) and the vendor portal (/pro/notifications). */
export function NotificationPreferencesSection({ party }: {party: JobParty;}) {
  const isCustomer = party === JOB_ACTOR.Customer;
  const p = useNotificationPreferences(party, isCustomer ? CURRENT_CUSTOMER_ID : vendorAccount.vendorId);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={isCustomer ? 'How we remind you about upcoming bookings' : 'How we remind you about jobs you’ve booked in'}
        backTo={isCustomer ? { to: '/profile', label: 'Profile' } : undefined} />

      <PageContainer width="narrow">
        {p.status === 'error' ?
        <ErrorState message={p.error ?? ''} onRetry={p.reload} /> :
        !p.loaded ?
        <LoadingState label="Loading your preferences" rows={2} rowClassName="h-40" /> :

        <NotificationPreferencesForm form={p.form} onSubmit={p.save} />
        }
      </PageContainer>
    </>);

}
