import { makeWorkingHours } from './weekdays';
import { moreVendors } from './moreVendors';
import type { Vendor } from '../types/marketplace';

export const vendors: Vendor[] = [
{
  id: 'bala-plumbing',
  name: 'Bala Plumbing Services',
  lga: 'Chanchaga LGA',
  coordinates: { lat: 9.6139, lng: 6.5569 },
  rating: 4.8,
  reviews: 62,
  distanceKm: 1.2,
  tagline: 'Responds in ~12 min',
  verification: 'trade',
  yearsExperience: 9,
  about: 'Pipe-fitting, borehole/pump repair, tank installation. Serves Minna metro.',
  priceRange: '₦3k–25k',
  responseTime: '~12 min',
  responseTimeMinutes: 12,
  photo: "/7dc19955-5e58-4910-a155-bea401f35289.jpg",
  gallery: [
  "/7dc19955-5e58-4910-a155-bea401f35289.jpg",
  "/a9d11f11-7784-4fed-80c6-44c46b6c48d4.jpg",
  "/7b603249-287d-4774-a819-d321f37568b0.jpg",
  "/b5817d72-46c7-4bc6-9b8d-d3a4479a8955.jpg"],
  bio: 'Licensed plumber serving Minna for 9 years. I fix leaks the same day, repair borehole pumps and install overhead tanks. You get a fixed quote before any work starts, and I clean up after.',
  tradeCategory: 'plumber',
  services: [
  {
    id: 's1',
    name: 'Pipe fitting & repair',
    minPrice: 2000,
    maxPrice: 15000,
    duration: '~1–2 hrs',
    description: 'Leaking taps, burst pipes and new fittings for kitchens and bathrooms.',
    photo: "/a9d11f11-7784-4fed-80c6-44c46b6c48d4.jpg"
  },
  {
    id: 's2',
    name: 'Borehole pump installation',
    minPrice: 20000,
    maxPrice: 60000,
    duration: '~1 day',
    description: 'Surface and submersible pumps, including wiring to your control box.',
    photo: "/7b603249-287d-4774-a819-d321f37568b0.jpg"
  },
  {
    id: 's3',
    name: 'Water tank installation',
    minPrice: 15000,
    maxPrice: 40000,
    duration: '~half day',
    description: 'Overhead and ground tanks from 500L to 5,000L, with stand and piping.',
    photo: "/b5817d72-46c7-4bc6-9b8d-d3a4479a8955.jpg"
  }],

  workingHours: makeWorkingHours({
    mon: ['08:00', '18:00'],
    tue: ['08:00', '18:00'],
    wed: ['08:00', '18:00'],
    thu: ['08:00', '18:00'],
    fri: ['08:00', '18:00'],
    sat: ['08:00', '18:00']
  }),
  serviceAreas: ['Bosso', 'Chanchaga', 'Paikoro'],
  products: [
  {
    id: 'p1',
    name: 'Kitchen mixer tap (chrome)',
    category: 'plumbing_supplies',
    price: 9500,
    description: 'Single-lever mixer tap with flexible hoses. Fits most Nigerian sink holes.',
    stock: 14,
    lowStockThreshold: 5,
    images: ["/a9d11f11-7784-4fed-80c6-44c46b6c48d4.jpg"],
    available: true
  },
  {
    id: 'p2',
    name: '1,000L water tank',
    category: 'plumbing_supplies',
    price: 78000,
    description: 'UV-stabilised tank with lid and outlet fittings. Installation booked separately.',
    stock: 3,
    lowStockThreshold: 5,
    images: ["/b5817d72-46c7-4bc6-9b8d-d3a4479a8955.jpg"],
    available: true
  },
  {
    id: 'p3',
    name: '1HP surface pump',
    category: 'plumbing_supplies',
    price: 65000,
    description: 'For boreholes and wells up to 9m. One-year warranty.',
    stock: 0,
    lowStockThreshold: 5,
    images: ["/7b603249-287d-4774-a819-d321f37568b0.jpg"],
    available: true
  },
  {
    id: 'p4',
    name: 'Pipe wrench, 14 inch',
    category: 'tools',
    price: 7500,
    description: '',
    stock: 6,
    lowStockThreshold: 5,
    images: ["/7dc19955-5e58-4910-a155-bea401f35289.jpg"],
    available: false
  }],
  fulfilment: {
    pickup: { enabled: true, address: 'Shop 4, Tunga Market Road, Minna', instructions: 'Ask for Bala at the blue kiosk. Open Mon–Sat, 8am–6pm.' },
    delivery: { enabled: true, fee: 1500, areas: ['Bosso', 'Chanchaga'] }
  }
},
{
  id: 'hauwa-tailoring',
  name: 'Hauwa Tailoring & Ankara',
  lga: 'Chanchaga LGA',
  coordinates: { lat: 9.6050, lng: 6.5480 },
  rating: 4.6,
  reviews: 118,
  distanceKm: 0.8,
  tagline: 'Aso-ebi specialist',
  verification: 'id',
  yearsExperience: 6,
  about: 'Custom Ankara, aso-ebi for weddings and naming ceremonies, alterations. 5–7 day turnaround.',
  priceRange: '₦5k–40k',
  responseTime: '~30 min',
  responseTimeMinutes: 30,
  photo: "/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg",
  gallery: ["/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg"],
  bio: 'I sew Ankara and aso-ebi for weddings, naming ceremonies and Sallah. I can take measurements at your home in Chanchaga, and most orders are ready in 5–7 days. Quick alterations are usually done the same week.',
  tradeCategory: 'tailor',
  services: [
  { id: 'h1', name: 'Custom Ankara outfit', minPrice: 8000, maxPrice: 25000, duration: '2+ days', description: 'Measured, cut and sewn to your style.', photo: null },
  { id: 'h2', name: 'Aso-ebi set', minPrice: 15000, maxPrice: 40000, duration: '2+ days', description: 'For weddings and naming ceremonies. Order two weeks ahead.', photo: null },
  { id: 'h3', name: 'Alterations', minPrice: 1500, maxPrice: 6000, duration: '~1–2 hrs', photo: null }],

  workingHours: makeWorkingHours({
    mon: ['09:00', '17:00'],
    tue: ['09:00', '17:00'],
    wed: ['09:00', '17:00'],
    thu: ['09:00', '17:00'],
    fri: ['09:00', '17:00'],
    sat: ['10:00', '15:00']
  }),
  serviceAreas: ['Bosso', 'Chanchaga'],
  products: [
  { id: 'p11', name: 'Ankara fabric, 6 yards', category: 'fabrics', price: 12000, description: 'Wax print, 100% cotton. New patterns every month.', stock: 40, lowStockThreshold: 5, images: ["/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg"], available: true },
  { id: 'p12', name: 'Ready-made kaftan', category: 'ready_made_clothing', price: 18500, description: 'Sizes M to XXL. Free hemming.', stock: 8, lowStockThreshold: 10, images: ["/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg"], available: true },
  { id: 'p13', name: 'Gele head tie', category: 'accessories', price: 4500, description: '', stock: 25, lowStockThreshold: 5, images: ["/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg"], available: true }],
  // Pickup only: Hauwa doesn't deliver.
  fulfilment: {
    pickup: { enabled: true, address: 'Hauwa Tailoring, opposite Chanchaga Primary School', instructions: 'Call when you arrive and I’ll bring your order out.' },
    delivery: { enabled: false, fee: 0, areas: [] }
  }
},
{
  id: 'ibrahim-electrical',
  name: 'Ibrahim Electrical Works',
  lga: 'Bosso LGA',
  coordinates: { lat: 9.6520, lng: 6.5180 },
  rating: 4.7,
  reviews: 41,
  distanceKm: 2.4,
  tagline: 'Solar & inverter installs',
  verification: 'trade',
  yearsExperience: 11,
  about: 'House wiring, fault tracing, solar panel and inverter installation, prepaid meter setup.',
  priceRange: '₦4k–80k',
  responseTime: '~20 min',
  responseTimeMinutes: 20,
  photo: "/8cea2981-0ed5-4d4d-aa23-828c0576dded.jpg",
  gallery: ["/8cea2981-0ed5-4d4d-aa23-828c0576dded.jpg"],
  bio: 'Certified electrician for homes and shops across Bosso and Minna. I handle wiring, fault tracing, prepaid meter setup, and solar and inverter installs. I test every circuit before I leave.',
  tradeCategory: 'electrician',
  services: [
  { id: 'i1', name: 'Fault tracing & repair', minPrice: 4000, maxPrice: 15000, duration: '~1–2 hrs', description: 'Tripping breakers, dead sockets and flickering lights.', photo: null },
  { id: 'i2', name: 'Prepaid meter setup', minPrice: 5000, maxPrice: 12000, duration: '~1 hr', photo: null },
  { id: 'i3', name: 'Solar & inverter installation', minPrice: 40000, maxPrice: 80000, duration: '~1 day', description: 'Panels, batteries and inverter sized to your load. Labour only.', photo: null }],

  workingHours: makeWorkingHours({
    mon: ['08:00', '17:30'],
    tue: ['08:00', '17:30'],
    wed: ['08:00', '17:30'],
    thu: ['08:00', '17:30'],
    fri: ['08:00', '17:30'],
    sat: ['09:00', '14:00']
  }),
  serviceAreas: ['Bosso', 'Chanchaga', 'Paikoro', 'Shiroro'],
  products: [
  { id: 'p21', name: 'LED bulb 15W (pack of 4)', category: 'electrical_supplies', price: 4800, description: 'Cool white, E27 screw base.', stock: 60, lowStockThreshold: 5, images: ["/8cea2981-0ed5-4d4d-aa23-828c0576dded.jpg"], available: true },
  { id: 'p22', name: '13A double socket', category: 'electrical_supplies', price: 2500, description: 'Switched, with surface box.', stock: 2, lowStockThreshold: 5, images: ["/8cea2981-0ed5-4d4d-aa23-828c0576dded.jpg"], available: true },
  { id: 'p23', name: 'Digital multimeter', category: 'tools', price: 15000, description: 'Auto-ranging, with leads and case.', stock: 5, lowStockThreshold: 5, images: ["/8cea2981-0ed5-4d4d-aa23-828c0576dded.jpg"], available: true }],
  // Delivery only: no shop front.
  fulfilment: {
    pickup: { enabled: false, address: '', instructions: '' },
    delivery: { enabled: true, fee: 1000, areas: ['Bosso', 'Chanchaga', 'Paikoro', 'Shiroro'] }
  },
  // Online payments only.
  acceptsCash: false
},
{
  id: 'zainab-dispatch',
  name: 'Zainab Swift Dispatch',
  lga: 'Chanchaga LGA',
  coordinates: { lat: 9.6170, lng: 6.5520 },
  rating: 4.5,
  reviews: 87,
  distanceKm: 1.9,
  tagline: 'Same-day across Minna',
  verification: 'id',
  yearsExperience: 4,
  about: 'Same-day parcel and document delivery within Minna. Market pickups from Kure and Bosso.',
  priceRange: '₦800–5k',
  responseTime: '~8 min',
  responseTimeMinutes: 8,
  photo: "/5f3ebb40-48fe-44e2-93d2-54fbf5cc1df0.jpg",
  gallery: ["/5f3ebb40-48fe-44e2-93d2-54fbf5cc1df0.jpg"],
  bio: 'Fast, careful dispatch rider across Minna. I deliver parcels and documents the same day and do market pickups from Kure and Bosso. Call me any time to check where your delivery is.',
  tradeCategory: 'dispatch_rider',
  services: [
  { id: 'z1', name: 'Same-day parcel delivery', minPrice: 800, maxPrice: 2500, duration: '~1 hr', description: 'Anywhere within Minna, picked up within the hour.', photo: null },
  { id: 'z2', name: 'Document delivery', minPrice: 800, maxPrice: 1500, duration: '~1 hr', photo: null },
  { id: 'z3', name: 'Market pickup', minPrice: 1500, maxPrice: 5000, duration: '~1–2 hrs', description: 'Kure and Bosso markets. Send a list and I buy and deliver.', photo: null }],

  workingHours: makeWorkingHours({
    mon: ['07:00', '20:00'],
    tue: ['07:00', '20:00'],
    wed: ['07:00', '20:00'],
    thu: ['07:00', '20:00'],
    fri: ['07:00', '20:00'],
    sat: ['07:00', '20:00'],
    sun: ['10:00', '18:00']
  }),
  serviceAreas: ['Bosso', 'Chanchaga'],
  products: []
},
...moreVendors];
