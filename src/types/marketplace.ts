import type { LucideIcon } from 'lucide-react';
import type { ServiceItem } from './vendorPortal';

export type CategoryId = 'plumbing' | 'tailoring' | 'electrical' | 'logistics';

export type CategoryIconName = 'wrench' | 'scissors' | 'zap' | 'bike';

export interface Category {
  id: CategoryId;
  label: string;
  icon: CategoryIconName;
  tintClass: string;
}

/** Verification tiers, lowest to highest. Names and order live in data/verificationTiers.ts. */
export type Verification = 'unverified' | 'id' | 'trade';

export interface VerificationTierOption {
  id: Verification;
  /** Exact badge name, e.g. "Trade-Verified". */
  label: string;
  /** What the tier means, shown in the filter. */
  description: string;
  /** Longer explanation for customers, shown when they tap the badge on a profile. */
  explanation: string;
}

/** Set while a vendor isn't taking new bookings or orders (on leave, fully booked…). */
export interface VendorUnavailability {
  reason: string;
  /** ISO date they're back, if known. */
  until: string | null;
}

export type TradeCategory =
'plumber' |
'electrician' |
'carpenter' |
'mechanic' |
'tailor' |
'painter' |
'dispatch_rider' |
'hair_stylist' |
'grocer' |
'other';

/** The 25 Local Government Areas of Niger State. */
export type NigerLga =
'Agaie' |
'Agwara' |
'Bida' |
'Borgu' |
'Bosso' |
'Chanchaga' |
'Edati' |
'Gbako' |
'Gurara' |
'Katcha' |
'Kontagora' |
'Lapai' |
'Lavun' |
'Magama' |
'Mariga' |
'Mashegu' |
'Mokwa' |
'Muya' |
'Paikoro' |
'Rafi' |
'Rijau' |
'Shiroro' |
'Suleja' |
'Tafa' |
'Wushishi';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayHours {
  open: boolean;
  /** 24-hour "HH:mm". Kept when the day is closed so re-opening restores it. */
  opensAt: string;
  closesAt: string;
}

export type WorkingHours = Record<Weekday, DayHours>;

export type ProductCategory =
'plumbing_supplies' |
'electrical_supplies' |
'fabrics' |
'ready_made_clothing' |
'tools' |
'building_materials' |
'accessories' |
'other';

export interface ProductCategoryOption {
  id: ProductCategory;
  label: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  /** Whole Naira. */
  price: number;
  description: string;
  /** Whole units, 0 or more. 0 means out of stock: customers can't order it. */
  stock: number;
  /** Show "Low stock" when stock is at or below this (and above 0). 0 turns the warning off. */
  lowStockThreshold: number;
  /** 1–5 photos. Products imported from a spreadsheet may have none until the vendor adds one; they stay unavailable until then. */
  images: string[];
  available: boolean;
}

export type NewProductInput = Omit<Product, 'id'>;

/** Derived from stock and lowStockThreshold; never stored, so it can't drift from the quantity. */
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type StockFilter = 'all' | Exclude<StockStatus, 'in_stock'>;

export interface StockFilterOption {
  id: StockFilter;
  label: string;
  /** Shown when this filter alone leaves the list empty. */
  emptyTitle: string;
  emptyHint: string;
}

export type CategoryKind = 'service' | 'retail';

/**
 * One entry in the shared category config (data/tradeCategories.ts). The vendor's trade field
 * and the customer's browse grid and search all read this one list.
 */
export interface TradeCategoryOption {
  id: TradeCategory;
  /** What a vendor is, e.g. "Plumber". Shown on profiles and badges. */
  label: string;
  /** What customers browse for, e.g. "Plumbing". */
  browseLabel: string;
  kind: CategoryKind;
  icon: LucideIcon;
  /** Background and text colour of the category's icon tile. */
  tintClass: string;
  /** Extra words that should find this category in search, lower case. */
  keywords: string[];
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Vendor {
  id: string;
  name: string;
  lga: string;
  /**
   * Where the vendor is based (latitude/longitude). Used for distance sorting and the map.
   * Null until the vendor sets a location; such vendors still appear in lists, just not on the map.
   */
  coordinates: GeoPoint | null;
  rating: number;
  reviews: number;
  distanceKm: number;
  tagline: string;
  verification: Verification;
  yearsExperience: number;
  about: string;
  priceRange: string;
  /** Display text such as "~12 min". Prefer responseTimeMinutes for new UI. */
  responseTime: string;
  /** Typical time to reply to a new request, in minutes. Missing or null when there isn't enough data yet. */
  responseTimeMinutes?: number | null;
  /** Present while the vendor isn't taking new bookings or orders. */
  unavailable?: VendorUnavailability | null;
  photo: string;
  /** Portfolio photos, max 10. */
  gallery: string[];
  /** Short public intro shown under the vendor's name. Max BIO_MAX_LENGTH characters. */
  bio?: string;
  tradeCategory: TradeCategory;
  /** Custom trade name, only set when tradeCategory is 'other'. */
  tradeCategoryOther?: string;
  services: ServiceItem[];
  workingHours: WorkingHours;
  serviceAreas: NigerLga[];
  products: Product[];
}

export type VendorProfileInput = Pick<Vendor, 'bio' | 'tradeCategory' | 'tradeCategoryOther'>;

export type VendorProfilePatch = Partial<
  Pick<Vendor, 'name' | 'bio' | 'tradeCategory' | 'tradeCategoryOther' | 'gallery' | 'services' | 'workingHours' | 'serviceAreas' | 'products'>>;

export type JobStage = 'requested' | 'quoted' | 'accepted' | 'in_progress' | 'completed';

export interface JobStageInfo {
  id: JobStage;
  label: string;
  badgeClass: string;
}

export interface Job {
  id: string;
  vendorId: string;
  description: string;
  photos: string[];
  scheduledAt: string;
  address: string;
  stage: JobStage;
  quote: number | null;
  createdAt: string;
}

export type NewJobInput = Pick<Job, 'vendorId' | 'description' | 'photos' | 'scheduledAt' | 'address'>;

export interface MessageThread {
  id: string;
  vendorId: string;
  jobId: string;
  preview: string;
  time: string;
  unread: boolean;
}