import { makeWorkingHours } from './weekdays';
import type {
  GeoPoint,
  NigerLga,
  ProductCategory,
  TradeCategory,
  Vendor,
  VendorFulfilment,
  VendorUnavailability,
  Verification } from
'../types/marketplace';

/**
 * Extra directory vendors so the customer feed has enough to sort by distance and paginate.
 * Spread across Minna (Chanchaga, Bosso), plus Suleja, Bida, Paikoro and Kontagora.
 */

interface DirectoryVendorSeed {
  id: string;
  name: string;
  tradeCategory: TradeCategory;
  lga: NigerLga;
  /** Null for vendors who haven't set a location yet. */
  coordinates: GeoPoint | null;
  /** Straight-line distance from central Minna, shown on the legacy vendor page. */
  distanceKm: number;
  rating: number;
  reviews: number;
  verification: Verification;
  yearsExperience: number;
  tagline: string;
  bio: string;
  photo: string;
  /** Null when there isn't enough data yet. */
  responseTimeMinutes: number | null;
  unavailable?: VendorUnavailability;
  /** [name, min ₦, max ₦, duration] */
  services: [string, number, number, string][];
  serviceAreas: NigerLga[];
  /** Retail vendors' shop: [name, category, price ₦, stock]. */
  products?: [string, ProductCategory, number, number][];
  fulfilment?: VendorFulfilment;
}

const MON_SAT_8_TO_6 = makeWorkingHours({
  mon: ['08:00', '18:00'],
  tue: ['08:00', '18:00'],
  wed: ['08:00', '18:00'],
  thu: ['08:00', '18:00'],
  fri: ['08:00', '18:00'],
  sat: ['08:00', '18:00']
});

/** The older free-text field, still read by the legacy vendor pages. */
function legacyResponseTime(minutes: number | null): string {
  if (minutes === null) return 'New vendor';
  return minutes < 60 ? `~${minutes} min` : `~${Math.round(minutes / 60)} hr${minutes >= 120 ? 's' : ''}`;
}

/** ISO date `n` days from now, so mock data stays current. */
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

const compact = (n: number) => n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n);

function directoryVendor(seed: DirectoryVendorSeed): Vendor {
  const min = Math.min(...seed.services.map((s) => s[1]));
  const max = Math.max(...seed.services.map((s) => s[2]));
  return {
    id: seed.id,
    name: seed.name,
    lga: `${seed.lga} LGA`,
    coordinates: seed.coordinates,
    rating: seed.rating,
    reviews: seed.reviews,
    distanceKm: seed.distanceKm,
    tagline: seed.tagline,
    verification: seed.verification,
    yearsExperience: seed.yearsExperience,
    about: seed.bio,
    priceRange: `₦${compact(min)}–${compact(max)}`,
    responseTime: legacyResponseTime(seed.responseTimeMinutes),
    responseTimeMinutes: seed.responseTimeMinutes,
    unavailable: seed.unavailable ?? null,
    photo: seed.photo,
    gallery: [seed.photo],
    bio: seed.bio,
    tradeCategory: seed.tradeCategory,
    services: seed.services.map(([name, minPrice, maxPrice, duration], i) => ({
      id: `${seed.id}-s${i + 1}`,
      name,
      minPrice,
      maxPrice,
      duration,
      photo: null
    })),
    workingHours: MON_SAT_8_TO_6,
    serviceAreas: seed.serviceAreas,
    products: (seed.products ?? []).map(([name, category, price, stock], i) => ({
      id: `${seed.id}-p${i + 1}`,
      name,
      category,
      price,
      description: '',
      stock,
      lowStockThreshold: 5,
      images: [seed.photo],
      available: true
    })),
    ...(seed.fulfilment ? { fulfilment: seed.fulfilment } : {})
  };
}

const IMG = {
  tools: '/7dc19955-5e58-4910-a155-bea401f35289.jpg',
  tap: '/a9d11f11-7784-4fed-80c6-44c46b6c48d4.jpg',
  pump: '/7b603249-287d-4774-a819-d321f37568b0.jpg',
  tank: '/b5817d72-46c7-4bc6-9b8d-d3a4479a8955.jpg',
  fabric: '/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg',
  electrical: '/8cea2981-0ed5-4d4d-aa23-828c0576dded.jpg',
  bike: '/5f3ebb40-48fe-44e2-93d2-54fbf5cc1df0.jpg'
};

export const moreVendors: Vendor[] = [
directoryVendor({
  id: 'musa-auto-clinic',
  name: 'Musa Auto Clinic',
  tradeCategory: 'mechanic',
  lga: 'Chanchaga',
  coordinates: { lat: 9.5985, lng: 6.5562 },
  distanceKm: 1.8,
  rating: 4.4,
  reviews: 53,
  verification: 'trade',
  yearsExperience: 12,
  tagline: 'Engines, brakes & AC',
  bio: 'Full car servicing in Tunga: engine work, brakes, suspension and car AC. Free diagnosis before any repair.',
  photo: IMG.tools,
  responseTimeMinutes: 25,
  services: [['Car servicing', 8000, 25000, '~half day'], ['Brake pads & discs', 6000, 30000, '~1–2 hrs'], ['Car AC regas', 10000, 18000, '~1–2 hrs']],
  serviceAreas: ['Chanchaga', 'Bosso']
}),
directoryVendor({
  id: 'fatima-fresh-foods',
  name: 'Fatima Fresh Foods',
  tradeCategory: 'grocer',
  lga: 'Chanchaga',
  coordinates: { lat: 9.5901, lng: 6.5284 },
  distanceKm: 3.4,
  rating: 4.7,
  reviews: 140,
  verification: 'id',
  yearsExperience: 7,
  tagline: 'Foodstuff delivered same day',
  bio: 'Rice, beans, garri, yam, oil and fresh pepper from Kure market. Order by noon for same-day delivery in Minna.',
  photo: IMG.bike,
  responseTimeMinutes: 10,
  services: [['Foodstuff delivery', 500, 2000, '~1–2 hrs'], ['Bulk rice & beans (50kg)', 45000, 90000, '~1 day']],
  serviceAreas: ['Chanchaga', 'Bosso'],
  products: [
  ['Local rice, 5kg', 'other', 7500, 30],
  ['Honey beans, 5kg', 'other', 9000, 12],
  ['Yellow garri, 4 paint rubbers', 'other', 6000, 4],
  ['Groundnut oil, 3L', 'other', 8500, 0],
  ['Fresh pepper mix (bag)', 'other', 2500, 20]],

  fulfilment: {
    pickup: { enabled: true, address: 'Stall 31, Kure Market (foodstuff line), Minna', instructions: 'Collect before 5pm. Show your order number at the stall.' },
    delivery: { enabled: true, fee: 1000, areas: ['Chanchaga', 'Bosso'] }
  }
}),
directoryVendor({
  id: 'danladi-carpentry',
  name: 'Danladi Carpentry & Furniture',
  tradeCategory: 'carpenter',
  lga: 'Bosso',
  coordinates: { lat: 9.6555, lng: 6.5121 },
  distanceKm: 5.9,
  rating: 4.6,
  reviews: 38,
  verification: 'trade',
  yearsExperience: 15,
  tagline: 'Doors, wardrobes, roofing',
  bio: 'Custom wardrobes, kitchen cabinets, doors and roofing. Workshop in Bosso Estate; I visit to measure for free.',
  photo: IMG.tools,
  responseTimeMinutes: 40,
  unavailable: { reason: 'On leave', until: inDays(9) },
  services: [['Door fitting', 6000, 25000, '~half day'], ['Built-in wardrobe', 120000, 450000, '2+ days'], ['Roof repair', 15000, 80000, '~1 day']],
  serviceAreas: ['Bosso', 'Chanchaga', 'Shiroro']
}),
directoryVendor({
  id: 'grace-hair-beauty',
  name: 'Grace Hair & Beauty',
  tradeCategory: 'hair_stylist',
  lga: 'Chanchaga',
  coordinates: { lat: 9.6331, lng: 6.5233 },
  distanceKm: 3.5,
  rating: 4.9,
  reviews: 212,
  verification: 'id',
  yearsExperience: 8,
  tagline: 'Braids, wigs & bridal makeup',
  bio: 'Knotless braids, wig installs and bridal makeup in Maitumbi. Home service available for weddings.',
  photo: IMG.fabric,
  responseTimeMinutes: 15,
  services: [['Knotless braids', 12000, 35000, '~half day'], ['Wig install', 8000, 20000, '~1–2 hrs'], ['Bridal makeup', 25000, 60000, '~1–2 hrs']],
  serviceAreas: ['Chanchaga', 'Bosso']
}),
directoryVendor({
  id: 'emeka-paints',
  name: 'Emeka Paints & Finishes',
  tradeCategory: 'painter',
  lga: 'Chanchaga',
  coordinates: { lat: 9.6161, lng: 6.5604 },
  distanceKm: 0.6,
  rating: 4.3,
  reviews: 29,
  verification: 'unverified',
  yearsExperience: 10,
  tagline: 'Interior & exterior painting',
  bio: 'Interior and exterior painting, screeding and POP ceilings in Tudun Wada. I bring my own ladders and drop sheets.',
  photo: IMG.tank,
  responseTimeMinutes: 60,
  services: [['Room painting', 15000, 40000, '~1 day'], ['Exterior painting', 80000, 350000, '2+ days'], ['Wall screeding', 20000, 90000, '~1 day']],
  serviceAreas: ['Chanchaga']
}),
directoryVendor({
  id: 'kure-market-grocery',
  name: 'Kure Market Provisions',
  tradeCategory: 'grocer',
  lga: 'Chanchaga',
  coordinates: { lat: 9.6125, lng: 6.5451 },
  distanceKm: 0.4,
  rating: 4.2,
  reviews: 64,
  verification: 'unverified',
  yearsExperience: 5,
  tagline: 'Provisions & drinks wholesale',
  bio: 'Provisions, drinks and toiletries at wholesale prices from my Kure market stall. Delivery across Chanchaga.',
  photo: IMG.bike,
  responseTimeMinutes: 20,
  services: [['Provisions delivery', 500, 1500, '~1 hr'], ['Carton drinks (wholesale)', 4500, 12000, '~1 hr']],
  serviceAreas: ['Chanchaga'],
  products: [
  ['Malt drink, carton of 24', 'other', 9800, 15],
  ['Bottled water, pack of 12', 'other', 2200, 40],
  ['Bathing soap, pack of 6', 'other', 3000, 3],
  ['Tin tomatoes, carton', 'other', 14500, 6]],

  fulfilment: {
    pickup: { enabled: true, address: 'Kure Market, Block C (drinks section), Minna', instructions: 'Wholesale orders can take 30 minutes to pack.' },
    delivery: { enabled: true, fee: 800, areas: ['Chanchaga'] }
  }
}),
directoryVendor({
  id: 'yusuf-borehole',
  name: 'Yusuf Plumbing & Borehole',
  tradeCategory: 'plumber',
  lga: 'Bosso',
  coordinates: { lat: 9.5334, lng: 6.4502 },
  distanceKm: 13.9,
  rating: 4.5,
  reviews: 47,
  verification: 'trade',
  yearsExperience: 13,
  tagline: 'Borehole drilling & pumps',
  bio: 'Borehole drilling, submersible pumps and overhead tanks. Based in Gidan Kwano, serving Bosso and Minna.',
  photo: IMG.pump,
  responseTimeMinutes: 35,
  services: [['Borehole pump repair', 15000, 45000, '~half day'], ['Submersible pump install', 60000, 150000, '~1 day'], ['Tap & pipe repair', 3000, 12000, '~1–2 hrs']],
  serviceAreas: ['Bosso', 'Chanchaga']
}),
directoryVendor({
  id: 'swift-wheels',
  name: 'Swift Wheels Logistics',
  tradeCategory: 'dispatch_rider',
  lga: 'Bosso',
  coordinates: { lat: 9.6602, lng: 6.5098 },
  distanceKm: 6.6,
  rating: 4.1,
  reviews: 33,
  verification: 'unverified',
  yearsExperience: 3,
  tagline: 'Bike & van deliveries',
  bio: 'Bike dispatch inside Minna and van moves for furniture and market loads. Bosso campus deliveries daily.',
  photo: IMG.bike,
  responseTimeMinutes: 12,
  services: [['Bike delivery', 700, 2500, '~1 hr'], ['Van move (furniture)', 15000, 45000, '~half day']],
  serviceAreas: ['Bosso', 'Chanchaga']
}),
directoryVendor({
  id: 'paiko-cool-electrical',
  name: 'Paiko Cool Electrical',
  tradeCategory: 'electrician',
  lga: 'Paikoro',
  coordinates: { lat: 9.4331, lng: 6.6334 },
  distanceKm: 22.2,
  rating: 4.0,
  reviews: 18,
  verification: 'trade',
  yearsExperience: 6,
  tagline: 'Wiring, fans & AC installs',
  bio: 'House wiring, ceiling fans and split AC installation in Paiko and the Minna road.',
  photo: IMG.electrical,
  responseTimeMinutes: 45,
  services: [['House wiring (per room)', 10000, 25000, '~1 day'], ['Split AC installation', 20000, 35000, '~half day']],
  serviceAreas: ['Paikoro', 'Chanchaga']
}),
directoryVendor({
  id: 'suleja-power-electrical',
  name: 'Suleja Power Electricals',
  tradeCategory: 'electrician',
  lga: 'Suleja',
  coordinates: { lat: 9.1806, lng: 7.1794 },
  distanceKm: 84.6,
  rating: 4.6,
  reviews: 75,
  verification: 'trade',
  yearsExperience: 9,
  tagline: 'Solar for homes & shops',
  bio: 'Solar, inverter and prepaid meter installs across Suleja and Tafa. Free load assessment before quoting.',
  photo: IMG.electrical,
  responseTimeMinutes: 20,
  services: [['Solar & inverter install', 45000, 120000, '~1 day'], ['Fault tracing', 4000, 15000, '~1–2 hrs']],
  serviceAreas: ['Suleja', 'Tafa']
}),
directoryVendor({
  id: 'abdullahi-mechanic',
  name: 'Abdullahi Mechanic Works',
  tradeCategory: 'mechanic',
  lga: 'Suleja',
  coordinates: { lat: 9.1902, lng: 7.1688 },
  distanceKm: 83.2,
  rating: 4.3,
  reviews: 41,
  verification: 'id',
  yearsExperience: 14,
  tagline: 'Toyota & Honda specialist',
  bio: 'Engine overhauls, gearbox and electrical faults for Toyota and Honda. Workshop off Suleja–Abuja road.',
  photo: IMG.tools,
  responseTimeMinutes: 30,
  services: [['Engine diagnosis', 5000, 10000, '~1 hr'], ['Gearbox repair', 40000, 150000, '2+ days']],
  serviceAreas: ['Suleja', 'Tafa', 'Gurara']
}),
directoryVendor({
  id: 'chidi-carpentry',
  name: 'Chidi Woodworks',
  tradeCategory: 'carpenter',
  lga: 'Suleja',
  coordinates: { lat: 9.1758, lng: 7.1867 },
  distanceKm: 85.3,
  rating: 4.4,
  reviews: 22,
  verification: 'id',
  yearsExperience: 11,
  tagline: 'Kitchen cabinets & beds',
  bio: 'Kitchen cabinets, beds and office furniture made to order in Suleja. Delivery to Tafa and Abuja.',
  photo: IMG.tools,
  responseTimeMinutes: 180,
  services: [['Kitchen cabinets', 250000, 900000, '2+ days'], ['Bed frame', 80000, 250000, '2+ days']],
  serviceAreas: ['Suleja', 'Tafa']
}),
directoryVendor({
  id: 'bida-royal-tailors',
  name: 'Bida Royal Tailors',
  tradeCategory: 'tailor',
  lga: 'Bida',
  coordinates: { lat: 9.0833, lng: 6.0167 },
  distanceKm: 82.5,
  rating: 4.8,
  reviews: 96,
  verification: 'trade',
  yearsExperience: 20,
  tagline: 'Babban riga & embroidery',
  bio: 'Hand-embroidered babban riga, kaftans and caps from the heart of Bida. Orders posted across Niger State.',
  photo: IMG.fabric,
  responseTimeMinutes: 600,
  services: [['Babban riga', 45000, 150000, '2+ days'], ['Kaftan', 15000, 35000, '2+ days']],
  serviceAreas: ['Bida', 'Gbako', 'Katcha']
}),
directoryVendor({
  id: 'kontagora-fresh-mart',
  name: 'Kontagora Fresh Mart',
  tradeCategory: 'grocer',
  lga: 'Kontagora',
  coordinates: { lat: 10.4, lng: 5.4667 },
  distanceKm: 147.1,
  rating: 4.1,
  reviews: 19,
  verification: 'unverified',
  yearsExperience: 4,
  tagline: 'Groceries & household items',
  bio: 'Groceries, toiletries and household items in Kontagora town. Delivery within the town the same day.',
  photo: IMG.bike,
  responseTimeMinutes: 240,
  services: [['Grocery delivery', 500, 1500, '~1–2 hrs']],
  serviceAreas: ['Kontagora']
}),
// New vendors with no reviews yet: they sort last under "Top rated".
directoryVendor({
  id: 'bosso-greens',
  name: 'Bosso Greens & Grains',
  tradeCategory: 'grocer',
  lga: 'Bosso',
  coordinates: { lat: 9.6448, lng: 6.5302 },
  distanceKm: 4.3,
  rating: 0,
  reviews: 0,
  verification: 'id',
  yearsExperience: 1,
  tagline: 'Just opened near Bosso market',
  bio: 'Fresh vegetables, grains and spices from Bosso market, delivered around Bosso and Maitumbi.',
  photo: IMG.bike,
  responseTimeMinutes: 30,
  services: [['Vegetable & grain delivery', 500, 2500, '~1–2 hrs']],
  serviceAreas: ['Bosso', 'Chanchaga'],
  products: [
  ['Tomatoes, small basket', 'other', 4000, 10],
  ['Onions, 2kg', 'other', 2800, 18],
  ['Millet, 5kg', 'other', 5500, 7]],

  fulfilment: {
    pickup: { enabled: true, address: 'Bosso Market, gate 2', instructions: 'Open daily 7am–6pm.' },
    delivery: { enabled: true, fee: 0, areas: ['Bosso'] }
  }
}),
// Hasn't set a map location yet: listed in results, left off the map.
directoryVendor({
  id: 'sadiya-stitches',
  name: 'Sadiya Stitches',
  tradeCategory: 'tailor',
  lga: 'Chanchaga',
  coordinates: null,
  distanceKm: 2.0,
  rating: 0,
  reviews: 0,
  verification: 'unverified',
  yearsExperience: 2,
  tagline: 'Home visits for alterations',
  bio: 'Alterations and simple Ankara styles. I come to you anywhere in Chanchaga for measurements.',
  photo: IMG.fabric,
  responseTimeMinutes: null,
  services: [['Alterations', 1000, 4000, '~1–2 hrs'], ['Simple Ankara style', 6000, 15000, '2+ days']],
  serviceAreas: ['Chanchaga']
})];
