import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { JOB_ACTOR } from '../../jobs/constants';
import { useAuth } from '../../auth/hooks/useAuth';
import { getPreferences, listJobReminders } from '../services/reminderService';
import type { Job, JobParty } from '../../jobs/types';

/**
 * The viewer's reminders for one job plus their channel preferences. Reloads when the booking changes
 * (status or time), so a reschedule or cancellation shows straight away.
 */
export function useJobReminders(job: Pick<Job, 'id' | 'status' | 'scheduledAt' | 'updatedAt'>, viewer: JobParty) {
  const { user } = useAuth();
  const viewerId = (viewer === JOB_ACTOR.Customer ? user?.id : user?.vendorId) ?? '';
  const { id, updatedAt } = job;
  const load = useCallback(
    () => Promise.all([listJobReminders(id, viewer), getPreferences(viewer, viewerId)]).then(([reminders, prefs]) => ({ reminders, prefs })),
    // updatedAt changes on every status change and accepted reschedule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, viewer, viewerId, updatedAt]
  );
  return useAsyncData(load);
}
