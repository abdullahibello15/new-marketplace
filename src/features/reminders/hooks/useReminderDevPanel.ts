import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { listAllReminders, listDeliveryLog, runDeliveryCheck, sendReminderNow } from '../services/reminderService';

const loadAll = () => Promise.all([listAllReminders(), listDeliveryLog()]).then(([reminders, log]) => ({ reminders, log }));

/** Dev panel state: every reminder, the delivery log, and the test actions (send one now, run the scheduler). */
export function useReminderDevPanel() {
  const data = useAsyncData(loadAll);
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const { reload } = data;

  const act = useCallback(
    async (key: string, action: () => Promise<string>) => {
      setBusy(key);
      try {
        toast.success(await action());
        reload();
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setBusy(null);
      }
    },
    [toast, reload]
  );

  return {
    ...data,
    busy,
    sendNow: (id: string) => act(id, async () => `Sent ${(await sendReminderNow(id)).id}. See the log below and Updates.`),
    runCheck: () => act('check', async () => {
      const { sent } = await runDeliveryCheck();
      return sent ? `Delivered ${sent} due ${sent === 1 ? 'reminder' : 'reminders'}.` : 'Nothing is due yet.';
    })
  };
}
