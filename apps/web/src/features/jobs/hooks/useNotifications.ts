import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { listNotifications, markAllNotificationsRead } from '../services/notificationService';
import type { JobParty } from '../types';

/** The signed-in person's job notifications, with "mark all read". */
export function useNotifications(recipient: JobParty, recipientId: string) {
  const load = useCallback(() => listNotifications(recipient, recipientId), [recipient, recipientId]);
  const { data, status, error, reload, setData } = useAsyncData(load);
  const toast = useToast();
  const [marking, setMarking] = useState(false);
  const items = data ?? [];

  async function markAllRead() {
    setMarking(true);
    try {
      await markAllNotificationsRead(recipient, recipientId);
      setData((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setMarking(false);
    }
  }

  return { items, unread: items.filter((n) => !n.read).length, status, error, reload, markAllRead, marking };
}
