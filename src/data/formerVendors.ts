import type { NigerLga, TradeCategory } from '../types/marketplace';

/**
 * MOCK: vendors who used Gwani and then closed their accounts. They're not in the directory any more,
 * but their past work and subscription payments are part of the platform's history (analytics, churn).
 */
export interface FormerVendor {
  id: string;
  name: string;
  tradeCategory: TradeCategory;
  lga: NigerLga;
  serviceAreas: NigerLga[];
  /** Months ago they joined and left. */
  joinedMonthsAgo: number;
  leftMonthsAgo: number;
  /** Typical value of one job or order, whole Naira. */
  typicalValue: number;
  planId: 'starter' | 'standard' | 'premium';
}

export const formerVendors: readonly FormerVendor[] = [
{ id: 'former-lapai-welders', name: 'Lapai Welding Works', tradeCategory: 'other', lga: 'Lapai', serviceAreas: ['Lapai', 'Agaie'], joinedMonthsAgo: 24, leftMonthsAgo: 9, typicalValue: 18000, planId: 'starter' },
{ id: 'former-mokwa-mechanics', name: 'Mokwa Auto Repairs', tradeCategory: 'mechanic', lga: 'Mokwa', serviceAreas: ['Mokwa'], joinedMonthsAgo: 20, leftMonthsAgo: 6, typicalValue: 15000, planId: 'standard' },
{ id: 'former-tafa-tailors', name: 'Tafa Fashion House', tradeCategory: 'tailor', lga: 'Tafa', serviceAreas: ['Tafa', 'Suleja'], joinedMonthsAgo: 18, leftMonthsAgo: 4, typicalValue: 12000, planId: 'starter' },
{ id: 'former-minna-fresh', name: 'Minna Fresh Basket', tradeCategory: 'grocer', lga: 'Chanchaga', serviceAreas: ['Chanchaga', 'Bosso'], joinedMonthsAgo: 16, leftMonthsAgo: 5, typicalValue: 9000, planId: 'standard' },
// Joined and left within the last year (so the cohort table and churn chart have something to show).
{ id: 'former-bosso-sparks', name: 'Bosso Sparks Electrical', tradeCategory: 'electrician', lga: 'Bosso', serviceAreas: ['Bosso'], joinedMonthsAgo: 12, leftMonthsAgo: 8, typicalValue: 11000, planId: 'starter' },
{ id: 'former-tunga-tailors', name: 'Tunga Tailors', tradeCategory: 'tailor', lga: 'Chanchaga', serviceAreas: ['Chanchaga'], joinedMonthsAgo: 11, leftMonthsAgo: 6, typicalValue: 9500, planId: 'starter' },
{ id: 'former-kpakungu-paints', name: 'Kpakungu Paint Masters', tradeCategory: 'painter', lga: 'Chanchaga', serviceAreas: ['Chanchaga', 'Bosso'], joinedMonthsAgo: 11, leftMonthsAgo: 3, typicalValue: 25000, planId: 'standard' },
{ id: 'former-suleja-riders', name: 'Suleja Quick Riders', tradeCategory: 'dispatch_rider', lga: 'Suleja', serviceAreas: ['Suleja', 'Tafa'], joinedMonthsAgo: 10, leftMonthsAgo: 7, typicalValue: 2500, planId: 'starter' },
{ id: 'former-bida-auto', name: 'Bida Auto Care', tradeCategory: 'mechanic', lga: 'Bida', serviceAreas: ['Bida'], joinedMonthsAgo: 10, leftMonthsAgo: 2, typicalValue: 14000, planId: 'standard' },
{ id: 'former-chanchaga-plumbing', name: 'Chanchaga Plumbing Co.', tradeCategory: 'plumber', lga: 'Chanchaga', serviceAreas: ['Chanchaga'], joinedMonthsAgo: 9, leftMonthsAgo: 4, typicalValue: 8000, planId: 'starter' },
{ id: 'former-maitumbi-braids', name: 'Maitumbi Braids & Beauty', tradeCategory: 'hair_stylist', lga: 'Bosso', serviceAreas: ['Bosso'], joinedMonthsAgo: 8, leftMonthsAgo: 3, typicalValue: 15000, planId: 'starter' },
{ id: 'former-paikoro-grains', name: 'Paikoro Grains Store', tradeCategory: 'grocer', lga: 'Paikoro', serviceAreas: ['Paikoro'], joinedMonthsAgo: 7, leftMonthsAgo: 2, typicalValue: 12000, planId: 'starter' },
{ id: 'former-kontagora-woodworks', name: 'Kontagora Woodworks', tradeCategory: 'carpenter', lga: 'Kontagora', serviceAreas: ['Kontagora'], joinedMonthsAgo: 6, leftMonthsAgo: 2, typicalValue: 40000, planId: 'standard' },
{ id: 'former-gidan-kwano-fix', name: 'Gidan Kwano Fix-It', tradeCategory: 'electrician', lga: 'Bosso', serviceAreas: ['Bosso', 'Shiroro'], joinedMonthsAgo: 5, leftMonthsAgo: 1, typicalValue: 9000, planId: 'starter' },
{ id: 'former-lapai-tailoring', name: 'Lapai Royal Tailoring', tradeCategory: 'tailor', lga: 'Lapai', serviceAreas: ['Lapai'], joinedMonthsAgo: 4, leftMonthsAgo: 1, typicalValue: 13000, planId: 'starter' },
{ id: 'former-mokwa-fresh', name: 'Mokwa Fresh Foods', tradeCategory: 'grocer', lga: 'Mokwa', serviceAreas: ['Mokwa'], joinedMonthsAgo: 3, leftMonthsAgo: 1, typicalValue: 7000, planId: 'starter' }];
