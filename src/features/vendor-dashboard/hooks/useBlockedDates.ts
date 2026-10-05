import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { fromDateKey } from '../../../lib/dates';
import { errorMessage } from '../../../lib/errors';
import { blockDate, listBlockedDates, unblockDate } from '../services/scheduleService';
import type { CalendarDay } from '../types';

const dayLabel = (key: string) => format(fromDateKey(key), 'EEE d MMM');

/**
 * The vendor's days off. Blocking a day that already has bookings asks for confirmation first,
 * because those customers still expect the vendor to turn up.
 */
export function useBlockedDates() {
  const { data, status, error, reload, setData } = useAsyncData(listBlockedDates);
  const toast = useToast();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [confirmDay, setConfirmDay] = useState<CalendarDay | null>(null);

  const blocked = useMemo(() => new Set((data ?? []).map((b) => b.date)), [data]);

  async function block(key: string) {
    setSavingKey(key);
    try {
      const created = await blockDate(key);
      setData((prev) => prev.some((b) => b.date === key) ? prev : [...prev, created]);
      toast.success(`${dayLabel(key)} is now a day off. Customers can’t book you that day.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSavingKey(null);
      setConfirmDay(null);
    }
  }

  async function unblock(key: string) {
    setSavingKey(key);
    try {
      await unblockDate(key);
      setData((prev) => prev.filter((b) => b.date !== key));
      toast.success(`${dayLabel(key)} is open for bookings again.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSavingKey(null);
    }
  }

  function requestBlock(day: CalendarDay) {
    if (day.bookings.length > 0) setConfirmDay(day);else
    void block(day.key);
  }

  return {
    blocked,
    status,
    error,
    reload,
    savingKey,
    requestBlock,
    unblock,
    confirmDay,
    confirmBlock: () => confirmDay && block(confirmDay.key),
    cancelBlock: () => setConfirmDay(null)
  };
}
