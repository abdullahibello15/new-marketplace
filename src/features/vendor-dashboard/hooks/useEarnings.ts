import { useMemo } from 'react';
import { format, parse } from 'date-fns';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { getEarningsOverview } from '../services/earningsService';
import type { ChartPoint } from '../../../utils/earnings';

const loadOverview = () => getEarningsOverview();

export function useEarnings() {
  const { data, status, error, reload } = useAsyncData(loadOverview);

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

  return { overview: data, chartData, status, error, reload };
}
