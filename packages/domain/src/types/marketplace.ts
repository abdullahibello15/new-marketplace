// Marketplace types the domain rules use. The rest stay in apps/web/src/types/marketplace.ts.

/** Verification tiers, lowest to highest. Names and order live in data/verificationTiers.ts. */
export type Verification = 'unverified' | 'id' | 'trade';

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

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Pickup and delivery options for product orders. At least one is enabled. */
export interface VendorFulfilment {
  pickup: {
    enabled: boolean;
    /** Shop or stall address customers collect from, e.g. "Shop 12, Kure Market, Minna". */
    address: string;
    /** e.g. "Ask for Bala at the blue kiosk. Open Mon–Sat, 8am–6pm." */
    instructions: string;
  };
  delivery: {
    enabled: boolean;
    /** Flat fee per order in whole Naira (MOCK). 0 means free delivery. */
    fee: number;
    /** LGAs the vendor delivers to. Delivery elsewhere is blocked at checkout. */
    areas: NigerLga[];
  };
}
