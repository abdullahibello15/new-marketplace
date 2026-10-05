import { addDays, format } from 'date-fns';
import { daysFromNow } from './time';
import type { BlockedDate } from '../types';

export const mockBlockedDates: BlockedDate[] = [
{ date: format(addDays(new Date(), 10), 'yyyy-MM-dd'), createdAt: daysFromNow(-4, 18) }];
