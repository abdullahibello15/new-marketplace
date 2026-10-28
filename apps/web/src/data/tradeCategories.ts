import {
  BikeIcon,
  CarIcon,
  HammerIcon,
  PaintRollerIcon,
  ScissorsIcon,
  ShapesIcon,
  ShoppingBasketIcon,
  SparklesIcon,
  WrenchIcon,
  ZapIcon } from
'lucide-react';
import type { TradeCategory, TradeCategoryOption } from '../types/marketplace';

export const BIO_MAX_LENGTH = 300;
export const TRADE_OTHER_MAX_LENGTH = 40;

/** Vendors pick this when no category fits; it is not offered as a browse category. */
export const OTHER_TRADE: TradeCategory = 'other';

/**
 * The one category config for the whole app: the vendor "Trade category" field, the customer
 * browse grid and search suggestions all read from here. Add a category once, here.
 */
export const tradeCategories: TradeCategoryOption[] = [
{
  id: 'plumber',
  label: 'Plumber',
  browseLabel: 'Plumbing',
  kind: 'service',
  icon: WrenchIcon,
  tintClass: 'bg-[#E3EEEC] text-pine',
  keywords: ['plumbing', 'pipe', 'tap', 'leak', 'borehole', 'water tank', 'toilet']
},
{
  id: 'electrician',
  label: 'Electrician',
  browseLabel: 'Electrical',
  kind: 'service',
  icon: ZapIcon,
  tintClass: 'bg-[#FBEFD2] text-mustard-dark',
  keywords: ['electrical', 'wiring', 'solar', 'inverter', 'meter', 'light']
},
{
  id: 'tailor',
  label: 'Tailor',
  browseLabel: 'Tailoring',
  kind: 'service',
  icon: ScissorsIcon,
  tintClass: 'bg-[#F8E4DA] text-clay-dark',
  keywords: ['tailoring', 'sewing', 'ankara', 'aso-ebi', 'alteration', 'fashion']
},
{
  id: 'dispatch_rider',
  label: 'Dispatch rider',
  browseLabel: 'Logistics',
  kind: 'service',
  icon: BikeIcon,
  tintClass: 'bg-[#F6E1E5] text-[#A8334C]',
  keywords: ['logistics', 'delivery', 'dispatch', 'parcel', 'courier', 'errand']
},
{
  id: 'grocer',
  label: 'Grocer',
  browseLabel: 'Groceries',
  kind: 'retail',
  icon: ShoppingBasketIcon,
  tintClass: 'bg-[#E6EFD9] text-[#3F6212]',
  keywords: ['groceries', 'food', 'foodstuff', 'rice', 'provisions', 'market']
},
{
  id: 'carpenter',
  label: 'Carpenter',
  browseLabel: 'Carpentry',
  kind: 'service',
  icon: HammerIcon,
  tintClass: 'bg-[#EFE6DA] text-[#7A4A1E]',
  keywords: ['carpentry', 'furniture', 'wood', 'door', 'roofing', 'cabinet']
},
{
  id: 'mechanic',
  label: 'Mechanic',
  browseLabel: 'Auto repair',
  kind: 'service',
  icon: CarIcon,
  tintClass: 'bg-[#E4EAF3] text-[#2B4A7A]',
  keywords: ['mechanic', 'car', 'auto', 'vehicle', 'engine', 'brake', 'okada']
},
{
  id: 'painter',
  label: 'Painter',
  browseLabel: 'Painting',
  kind: 'service',
  icon: PaintRollerIcon,
  tintClass: 'bg-[#EDE6F5] text-[#5B3E8A]',
  keywords: ['painting', 'paint', 'wall', 'screeding', 'decoration']
},
{
  id: 'hair_stylist',
  label: 'Hair stylist',
  browseLabel: 'Hair & beauty',
  kind: 'service',
  icon: SparklesIcon,
  tintClass: 'bg-[#F9E3EE] text-[#9D2E63]',
  keywords: ['hair', 'beauty', 'braids', 'barber', 'makeup', 'salon', 'nails']
},
{
  id: OTHER_TRADE,
  label: 'Other',
  browseLabel: 'Other',
  kind: 'service',
  icon: ShapesIcon,
  tintClass: 'bg-sand text-ink',
  keywords: []
}];


/** Categories customers can browse (everything except "Other"). */
export const browseCategories = tradeCategories.filter((c) => c.id !== OTHER_TRADE);

export function findTradeCategory(id: string | null | undefined): TradeCategoryOption | undefined {
  return tradeCategories.find((c) => c.id === id);
}
