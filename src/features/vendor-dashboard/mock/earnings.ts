import { format, subMonths } from 'date-fns';
import { daysFromNow } from './time';
import type { PayoutStatus } from '../types';

export interface MockTransaction {
  id: string;
  customerName: string;
  item: string;
  completedAt: string;
  /** What the customer paid. The service derives the vendor's net amount. */
  grossAmount: number;
  payoutStatus: PayoutStatus;
}

export const mockTransactions: MockTransaction[] = [
{ id: 't201', customerName: 'Emeka Nwosu', item: 'Drain unblocking', completedAt: daysFromNow(-1, 10), grossAmount: 5500, payoutStatus: 'pending' },
{ id: 't202', customerName: 'Salisu Tanko', item: 'Toilet cistern repair', completedAt: daysFromNow(-2, 13), grossAmount: 12000, payoutStatus: 'pending' },
{ id: 't203', customerName: 'Chinedu Okeke', item: 'Shower mixer install', completedAt: daysFromNow(-3, 16), grossAmount: 15000, payoutStatus: 'pending' },
{ id: 't204', customerName: 'Grace Ibrahim', item: 'Water tank installation', completedAt: daysFromNow(-6, 15), grossAmount: 33100, payoutStatus: 'paid' },
{ id: 't205', customerName: 'Halima Yusuf', item: 'Tap replacement', completedAt: daysFromNow(-7, 11), grossAmount: 6500, payoutStatus: 'paid' },
{ id: 't206', customerName: 'Yusuf Danjuma', item: 'Pipe wrench, 14 inch', completedAt: daysFromNow(-9, 12), grossAmount: 7500, payoutStatus: 'paid' },
{ id: 't207', customerName: 'Fatima Bello', item: 'Leak inspection & fix', completedAt: daysFromNow(-12, 12), grossAmount: 9200, payoutStatus: 'paid' },
{ id: 't208', customerName: 'Musa Kabiru', item: 'Borehole pump service', completedAt: daysFromNow(-15, 9), grossAmount: 18000, payoutStatus: 'paid' },
{ id: 't209', customerName: 'Ngozi Adeyemi', item: 'Pipe fitting & repair', completedAt: daysFromNow(-19, 14), grossAmount: 7800, payoutStatus: 'paid' },
{ id: 't210', customerName: 'Aisha Mohammed', item: 'Kitchen mixer tap (chrome)', completedAt: daysFromNow(-24, 10), grossAmount: 9500, payoutStatus: 'paid' },
{ id: 't211', customerName: 'Ibrahim Sani', item: 'Bathroom pipe replacement', completedAt: daysFromNow(-31, 11), grossAmount: 24500, payoutStatus: 'paid' }];


/** Net earnings for each past month, newest last. Index 0 is 14 months ago. */
const PAST_MONTH_TOTALS = [
96400, 104800, 88300, 121500, 117200, 132900, 98600, 141300, 126700, 152200, 138900, 164500, 149800, 171300];


/** Monthly history keyed "yyyy-MM", excluding the current month (computed from transactions). */
export const mockMonthlyHistory: Record<string, number> = Object.fromEntries(
  PAST_MONTH_TOTALS.map((total, i) => [format(subMonths(new Date(), PAST_MONTH_TOTALS.length - i), 'yyyy-MM'), total])
);
