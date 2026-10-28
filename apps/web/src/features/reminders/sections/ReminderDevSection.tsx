import { RotateCwIcon, SendIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { MOCK_DELIVERY } from '../config';
import { DeliveryLogList } from '../components/dev/DeliveryLogList';
import { DevReminderTable } from '../components/dev/DevReminderTable';
import { useReminderDevPanel } from '../hooks/useReminderDevPanel';

/**
 * DEV ONLY (the route is registered only when import.meta.env.DEV). Shows every booking reminder with its
 * time to fire, lets you send one now or run the scheduler, and lists what the mock "sent".
 */
export function ReminderDevSection() {
  const d = useReminderDevPanel();

  return (
    <>
      <PageHeader title="Reminder dev panel" subtitle="Testing only. Not part of the production build." />
      <PageContainer className="space-y-6">
        <p className="rounded-xl bg-[#FBF3DC] px-4 py-3 text-sm text-ink">
          Nothing really leaves the app: push and SMS are simulated. SMS to numbers ending in {MOCK_DELIVERY.failingSmsSuffix} fail on purpose. Reminders
          also go out by themselves when due, whenever a jobs page loads.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button icon={SendIcon} onClick={d.runCheck} loading={d.busy === 'check'} disabled={d.busy !== null}>
            Run delivery check
          </Button>
          <Button variant="outline" icon={RotateCwIcon} onClick={d.reload}>
            Refresh
          </Button>
        </div>

        {d.status === 'error' && <ErrorState message={d.error ?? ''} onRetry={d.reload} />}
        {!d.data && d.status === 'loading' && <LoadingState label="Loading reminders" rows={2} />}
        {d.data &&
        <>
            <section aria-labelledby="dev-reminders-heading" className="space-y-2">
              <h2 id="dev-reminders-heading" className="text-base font-bold text-ink">
                Reminders ({d.data.reminders.length})
              </h2>
              <DevReminderTable reminders={d.data.reminders} busy={d.busy} onSendNow={d.sendNow} />
            </section>
            <section aria-labelledby="dev-log-heading" className="space-y-2">
              <h2 id="dev-log-heading" className="text-base font-bold text-ink">
                Delivery log ({d.data.log.length})
              </h2>
              <DeliveryLogList log={d.data.log} />
            </section>
          </>
        }
      </PageContainer>
    </>);

}
