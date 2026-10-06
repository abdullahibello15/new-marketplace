import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { preferencesSchema, type PreferencesFormData, type PreferencesFormValues } from '../schemas';
import { getPreferences, savePreferences } from '../services/reminderService';
import { formatLocalPhone } from '../utils/phone';
import type { JobParty } from '../../jobs/types';
import type { NotificationPreferences } from '../types';

const toValues = (p: NotificationPreferences): PreferencesFormValues => ({ ...p, phone: p.phone ? formatLocalPhone(p.phone) : '' });

/** Loads and saves one person's reminder preferences (push, SMS, phone, opt-out) with RHF + Zod. */
export function useNotificationPreferences(party: JobParty, id: string) {
  const toast = useToast();
  const load = useCallback(() => getPreferences(party, id), [party, id]);
  const prefs = useAsyncData(load);
  const form = useForm<PreferencesFormValues, unknown, PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: { push: true, sms: false, optedOut: false, phone: '' }
  });
  const { reset } = form;

  // Fill the form once the saved preferences arrive.
  useEffect(() => {
    if (prefs.data) reset(toValues(prefs.data));
  }, [prefs.data, reset]);

  const save = form.handleSubmit(
    async (data) => {
      try {
        const saved = await savePreferences(party, id, data);
        reset(toValues(saved));
        toast.success(saved.optedOut ? 'Saved. You won’t get booking reminders.' : 'Saved. Your reminders will use these settings.');
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    () => toast.error('Check the phone number before saving.')
  );

  return { form, save, status: prefs.status, error: prefs.error, reload: prefs.reload, loaded: prefs.data !== null };
}
