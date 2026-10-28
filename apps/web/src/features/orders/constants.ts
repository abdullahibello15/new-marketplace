// Moved to packages/domain (@zamani/domain); this path keeps working. The badge styling (UI) stays here.
import { ORDER_STATUS_META as ORDER_STATUS_META_TEXT } from '@zamani/domain/features/orders/constants';
import type { OrderStatus } from './types';
export * from '@zamani/domain/features/orders/constants';

/** Badge styling per value (UI only); the labels come from @zamani/domain. */
const ORDER_STATUS_META_UI: Record<OrderStatus, {badgeClass: string;dotClass: string;}> = {
  placed: { badgeClass: 'bg-[#E4EAF3] text-[#2B4A7A]', dotClass: 'bg-[#2B4A7A]' },
  confirmed: { badgeClass: 'bg-[#E3EEEC] text-pine', dotClass: 'bg-pine' },
  preparing: { badgeClass: 'bg-[#F7EBCB] text-mustard-dark', dotClass: 'bg-mustard-dark' },
  dispatched: { badgeClass: 'bg-[#EDE6F5] text-[#5B3E8A]', dotClass: 'bg-[#5B3E8A]' },
  delivered: { badgeClass: 'bg-[#FFE8CC] text-[#8A4B00]', dotClass: 'bg-[#8A4B00]' },
  ready_for_pickup: { badgeClass: 'bg-[#EDE6F5] text-[#5B3E8A]', dotClass: 'bg-[#5B3E8A]' },
  collected: { badgeClass: 'bg-[#FFE8CC] text-[#8A4B00]', dotClass: 'bg-[#8A4B00]' },
  completed: { badgeClass: 'bg-pine text-white', dotClass: 'bg-white' },
  declined: { badgeClass: 'bg-clay-soft text-clay-dark', dotClass: 'bg-clay-dark' },
  cancelled: { badgeClass: 'bg-sand text-muted', dotClass: 'bg-muted' },
  out_of_stock: { badgeClass: 'bg-[#F9E3EE] text-[#9D2E63]', dotClass: 'bg-[#9D2E63]' },
  disputed: { badgeClass: 'bg-[#8F3916] text-white', dotClass: 'bg-white' }
};

export const ORDER_STATUS_META: Record<OrderStatus, {label: string;badgeClass: string;dotClass: string;description: string;}> = Object.fromEntries(
  (Object.keys(ORDER_STATUS_META_TEXT) as OrderStatus[]).map((s) => {
    const ui = ORDER_STATUS_META_UI[s];
    return [s, { label: ORDER_STATUS_META_TEXT[s].label, badgeClass: ui.badgeClass, dotClass: ui.dotClass, description: ORDER_STATUS_META_TEXT[s].description }];
  })
) as Record<OrderStatus, {label: string;badgeClass: string;dotClass: string;description: string;}>;
