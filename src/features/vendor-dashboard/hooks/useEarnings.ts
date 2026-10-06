import { useMemo, useState } from 'react';
import { format, parse } from 'date-fns';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { formatNaira } from '../../../utils/format';
import { getEarningsOverview, requestPayout } from '../services/earningsService';
import type { ChartPoint } from '../../../utils/earnings';

const loadOverview = () => getEarningsOverview();

export function useEarnings() {
  const { data, status, error, reload } = useAsyncData(loadOverview);
  const toast = useToast();
  const [withdrawing, setWithdrawing] = useState(false);

  /** Bars for the shared EarningsChart; the current month is highlighted. */
  const chartData = useMemo<ChartPoint[]>(
    () =>
    (data?.monthly ?? []).map((m, i, all) => ({
      label: format(parse(m.month, 'yyyy-MM', new Date()), 'MMM'),
      total: m.total,
      highlight: i === all.length - 1
    })),
    [data]
  );

  /** Pays out the Available balance, then refreshes the buckets and the table. Resolves true on success. */
  async function withdraw(): Promise<boolean> {
    if (withdrawing) return false;
    setWithdrawing(true);
    try {
      const sent = await requestPayout();
      toast.success(`${formatNaira(sent)} is on its way to your bank.`);
      reload();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setWithdrawing(false);
    }
  }

  return { overview: data, chartData, status, error, reload, withdraw, withdrawing };
}
