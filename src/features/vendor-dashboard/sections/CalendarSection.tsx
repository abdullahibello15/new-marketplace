import { useId, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfToday } from 'date-fns';
import { PageHeader } from '../../../components/PageHeader';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { fromDateKey, isDateKey } from '../../../lib/dates';
import { JOB_STATUS } from '../../jobs/constants';
import type { JobStatus } from '../../jobs/types';
import { BlockDayDialog } from '../components/calendar/BlockDayDialog';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { CalendarLegend } from '../components/calendar/CalendarLegend';
import { CalendarToolbar } from '../components/calendar/CalendarToolbar';
import { DayPanel } from '../components/calendar/DayPanel';
import { useBlockedDates } from '../hooks/useBlockedDates';
import { useCalendar } from '../hooks/useCalendar';
import { useRequests } from '../hooks/useRequests';
import { useWorkingHours } from '../hooks/useWorkingHours';
import { groupBookingsByDay, isBooking } from '../utils/calendar';

export function CalendarSection() {
  const titleId = useId();
  const [params] = useSearchParams();
  const dateParam = params.get('date');
  const initialDate = isDateKey(dateParam) ? fromDateKey(dateParam) : undefined;

  const { jobs, status: jobsStatus, error: jobsError, reload: reloadJobs } = useRequests();
  const schedule = useBlockedDates();
  const workingHours = useWorkingHours();
  const bookingsByDay = useMemo(() => groupBookingsByDay(jobs), [jobs]);
  const cal = useCalendar({ initialDate, bookingsByDay, workingHours, blocked: schedule.blocked });

  const upcoming = useMemo(() => {
    const today = startOfToday().getTime();
    const active: JobStatus[] = [JOB_STATUS.Scheduled, JOB_STATUS.InProgress];
    return jobs.filter((j) => isBooking(j) && active.includes(j.status) && new Date(j.scheduledAt).getTime() >= today).length;
  }, [jobs]);

  const loading = jobsStatus === 'loading' && jobs.length === 0 || schedule.status === 'loading';
  const error = jobsStatus === 'error' ? jobsError : schedule.status === 'error' ? schedule.error : null;

  function retry() {
    if (jobsStatus === 'error') reloadJobs();
    if (schedule.status === 'error') schedule.reload();
  }

  function renderGrid() {
    if (error !== null) return <ErrorState message={error} onRetry={retry} />;
    if (loading) return <LoadingState label="Loading your calendar" rows={1} rowClassName="h-96" />;
    return (
      <CalendarGrid
        days={cal.days}
        view={cal.view}
        selectedKey={cal.selectedDay.key}
        labelledBy={titleId}
        onSelect={cal.select}
        onMove={cal.moveBy}
        onWeekEdge={cal.moveToWeekEdge} />);


  }

  return (
    <>
      <PageHeader title="Calendar" subtitle={`${upcoming} upcoming ${upcoming === 1 ? 'booking' : 'bookings'}`} />
      <PageContainer>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="min-w-0">
            <CalendarToolbar
              title={cal.title}
              titleId={titleId}
              view={cal.view}
              onViewChange={cal.setView}
              onPrevious={cal.previous}
              onNext={cal.next}
              onToday={cal.goToToday} />

            <div className="mt-4">{renderGrid()}</div>
            <CalendarLegend />
          </div>

          {!loading && error === null &&
          <div className="lg:sticky lg:top-8 lg:self-start">
              <DayPanel
              day={cal.selectedDay}
              workingHours={workingHours}
              saving={schedule.savingKey === cal.selectedDay.key}
              onBlock={schedule.requestBlock}
              onUnblock={schedule.unblock} />

            </div>
          }
        </div>
      </PageContainer>

      <BlockDayDialog
        day={schedule.confirmDay}
        loading={schedule.confirmDay !== null && schedule.savingKey === schedule.confirmDay.key}
        onConfirm={schedule.confirmBlock}
        onCancel={schedule.cancelBlock} />

    </>);

}
