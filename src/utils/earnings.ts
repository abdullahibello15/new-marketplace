import { format, isSameDay, startOfDay, subDays } from 'date-fns';
import type { EarningTransaction } from '../types/vendorPortal';

export interface ChartPoint {
  label: string;
  total: number;
  highlight: boolean;
}

export function lastNDays(transactions: EarningTransaction[], n = 7): ChartPoint[] {
  const today = startOfDay(new Date());
  return Array.from({ length: n }, (_, i) => {
    const day = subDays(today, n - 1 - i);
    const total = transactions.
    filter((t) => isSameDay(new Date(t.date), day)).
    reduce((sum, t) => sum + t.amount, 0);
    return { label: i === n - 1 ? 'Today' : format(day, 'EEE'), total, highlight: i === n - 1 };
  });
}

export function netAmount(amount: number, feeRate: number): number {
  return Math.round(amount * (1 - feeRate));
}