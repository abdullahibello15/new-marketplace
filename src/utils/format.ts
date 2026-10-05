import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { tradeCategories } from '../data/tradeCategories';
import type { VendorProfileInput } from '../types/marketplace';

export function formatTrade({ tradeCategory, tradeCategoryOther }: VendorProfileInput): string {
  if (tradeCategory === 'other') return tradeCategoryOther?.trim() || 'Other';
  return tradeCategories.find((t) => t.id === tradeCategory)?.label ?? 'Other';
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

/** "₦2,000 – ₦15,000", or a single price when min and max match. */
export function formatPriceRange(min: number, max: number): string {
  return min === max ? formatNaira(min) : `${formatNaira(min)} – ${formatNaira(max)}`;
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, d MMM');
}

export function formatTime(iso: string): string {
  return format(new Date(iso), 'h:mm a');
}