import { useTranslation } from 'react-i18next';
import { TruckIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { PageContainer } from '../../../components/ui/PageContainer';
import { lgaLabel } from '../../../i18n/labels';
import { useAuth } from '../../auth/hooks/useAuth';

/**
 * /rider — PLACEHOLDER rider dashboard. The role, routes and navigation shell exist so delivery features
 * can be added later; nothing about deliveries is built yet.
 */
export function RiderDashboardSection() {
  const { t } = useTranslation('auth');
  const { user } = useAuth();
  const rider = user?.rider;
  const first = user?.name.split(' ')[0];
  return (
    <>
      <PageHeader title={first ? t('rider.greeting', { name: first }) : t('rider.greetingNoName')} subtitle={t('rider.subtitle')} />
      <PageContainer className="space-y-4">
        <section className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
          <TruckIcon className="h-10 w-10 text-muted" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-extrabold">{t('rider.comingSoonTitle')}</h2>
          <p className="mt-1 max-w-md text-sm text-muted">{t('rider.comingSoonText')}</p>
        </section>
        {rider &&
        <dl className="grid max-w-xl gap-2 rounded-2xl border border-line bg-white p-4 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">{t('rider.area')}</dt><dd className="font-semibold">{rider.town}, {lgaLabel(rider.lga)}</dd></div>
            <div><dt className="text-muted">{t('rider.vehicle')}</dt><dd className="font-semibold">{t(`common:vehicle.${rider.vehicle}`)}</dd></div>
            <div><dt className="text-muted">{t('rider.plate')}</dt><dd className="font-semibold">{rider.plateNumber ?? '—'}</dd></div>
          </dl>
        }
      </PageContainer>
    </>);

}
