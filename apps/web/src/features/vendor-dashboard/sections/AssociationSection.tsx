import { useTranslation } from 'react-i18next';
import { subscriptionStatusLabel } from '../../../i18n/labels';
import { formatDate as format } from '../../../utils/format';
import { ReceiptTextIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { NotificationList } from '../../jobs/components/notifications/NotificationList';
import { JOB_ACTOR } from '../../jobs/constants';
import { BUNDLE_RULES } from '../bundles';
import { ASSOCIATION_MEMBER_STATUS, DASHBOARD_ROUTES, SUBSCRIPTION_STATUS, SUBSCRIPTION_STATUS_META } from '../constants';
import { AddMemberForm } from '../components/association/AddMemberForm';
import { AssociationMemberList } from '../components/association/AssociationMemberList';
import { BundleSummary } from '../components/association/BundleSummary';
import { InvoiceTable } from '../components/subscription/InvoiceTable';
import { SubscriptionDemoControls } from '../components/subscription/SubscriptionDemoControls';
import { SubscriptionRemindersList } from '../components/subscription/SubscriptionRemindersList';
import { useAssociationAdmin } from '../hooks/useAssociationAdmin';
import { DEMO_ASSOCIATION_ID } from '../mock/associations';
import { adminReminderKey } from '../services/subscriptionReminders';

/**
 * /pro/association — the trade association admin screen (MOCK: the demo signs you in as the admin of
 * one association). Members, the bundle total with its discount, one payment for everyone, billing
 * history, and the bundle's renewal reminders.
 */
export function AssociationSection() {
  const { t } = useTranslation('vendor');
  const a = useAssociationAdmin(DEMO_ASSOCIATION_ID);
  const data = a.overview.data;

  function renderBody() {
    if (a.overview.status === 'error') return <ErrorState message={a.overview.error ?? ''} onRetry={a.overview.reload} />;
    if (!data) return <LoadingState label={t('association.loading')} rows={3} rowClassName="h-32" />;
    const status = SUBSCRIPTION_STATUS_META[data.status];
    const lapsed = data.status === SUBSCRIPTION_STATUS.Grace || data.status === SUBSCRIPTION_STATUS.Suspended;

    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="bundle-status-heading" className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
            <h2 id="bundle-status-heading" className="font-bold text-ink">{t('association.bundle')}</h2>
            <Badge tone={status.tone} dot>{subscriptionStatusLabel(data.status, status.label)}</Badge>
            <p className="text-sm text-muted">
              {lapsed ?
              t('association.ended', { date: format(data.association.renewsOn, 'EEE d MMM yyyy') }) :
              t('association.renews', { date: format(data.association.renewsOn, 'EEE d MMM yyyy') })}
              {lapsed && data.status === SUBSCRIPTION_STATUS.Grace && ` · ${t('association.pausedAfter', { date: format(data.graceEndsAt, 'd MMM') })}`}
              {data.status === SUBSCRIPTION_STATUS.Suspended && ` · ${t('association.suspendedNote')}`}
            </p>
          </section>

          <section aria-labelledby="members-heading" className="space-y-3">
            <h2 id="members-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
              {t('association.membersHeading', { covered: data.coveredCount, used: data.countedCount, max: BUNDLE_RULES.maxMembers })}
            </h2>
            <AssociationMemberList association={data.association} onRemove={a.askRemove} />
            <AddMemberForm form={a.form} onSubmit={() => void a.addMember()} full={data.countedCount >= BUNDLE_RULES.maxMembers} />
          </section>

          <section aria-labelledby="assoc-billing-heading" className="space-y-3">
            <h2 id="assoc-billing-heading" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
              <ReceiptTextIcon className="h-4 w-4" aria-hidden="true" />
              {t('subscription.billingTitle')}
            </h2>
            {a.invoices.status === 'error' && <ErrorState message={a.invoices.error ?? ''} onRetry={a.invoices.reload} />}
            {a.invoices.data && (
            a.invoices.data.length ?
            <InvoiceTable invoices={a.invoices.data} /> :
            <EmptyState icon={ReceiptTextIcon} title={t('association.noInvoices')} description={t('association.noInvoicesText')} />)
            }
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start" aria-label={t('association.billing')}>
          <BundleSummary plan={data.plan} renewal={data.renewal} additions={data.additions} busy={a.busy} onPay={(kind) => void a.pay(kind)} />
          <SubscriptionRemindersList reminderKey={adminReminderKey(data.association.id)} refreshKey={data.association.renewsOn} />
          <NotificationList recipient={JOB_ACTOR.Vendor} recipientId={data.association.id} linkFor={() => DASHBOARD_ROUTES.association} />
          <SubscriptionDemoControls title={t('association.demoTitle')} busy={a.busy !== null} onSimulate={(state) => void a.simulate(state)} />
        </aside>
      </div>);

  }

  return (
    <>
      <PageHeader
        title={data?.association.name ?? t('association.title')}
        subtitle={data ? t('association.subtitle', { name: data.association.adminName }) : undefined} />

      <PageContainer>{renderBody()}</PageContainer>
      <ConfirmDialog
        open={a.removing !== null}
        title={a.removing ? t('association.removeTitle', { name: a.removing.vendorName }) : ''}
        description={
        a.removing?.status === ASSOCIATION_MEMBER_STATUS.Active ?
        t('association.removeActive') :
        t('association.removePending')
        }
        confirmLabel={t('association.removeConfirm')}
        cancelLabel={t('association.keep')}
        destructive
        loading={a.busy === 'remove'}
        onConfirm={() => void a.confirmRemove()}
        onCancel={a.cancelRemove} />

    </>);

}
