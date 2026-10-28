import { MODERATION_KIND, MODERATION_SOURCE, MODERATION_STATUS } from '../constants';
import type { ModerationItem, ModerationKind, ModerationSource } from '../types';

/*
 * MOCK moderation queue. Items point at real content in the vendor directory (profile photos, portfolio
 * photos, product ids) and real reviews (generated public reviews and the flagged ones in public-profile),
 * so approving and removing change what customers see. Reviews the demo vendor reports from their
 * dashboard ("Report review") join the queue live. A few items are already removed and under appeal.
 */
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const DAY = 24;

const IMG = {
  tools: '/7dc19955-5e58-4910-a155-bea401f35289.jpg',
  tap: '/a9d11f11-7784-4fed-80c6-44c46b6c48d4.jpg',
  pump: '/7b603249-287d-4774-a819-d321f37568b0.jpg',
  tank: '/b5817d72-46c7-4bc6-9b8d-d3a4479a8955.jpg',
  fabric: '/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg',
  electrical: '/8cea2981-0ed5-4d4d-aa23-828c0576dded.jpg',
  bike: '/5f3ebb40-48fe-44e2-93d2-54fbf5cc1df0.jpg'
};

const NAMES: Record<string, string> = {
  'bala-plumbing': 'Bala Plumbing Services',
  'hauwa-tailoring': 'Hauwa Tailoring & Ankara',
  'ibrahim-electrical': 'Ibrahim Electrical Works',
  'zainab-dispatch': 'Zainab Swift Dispatch',
  'musa-auto-clinic': 'Musa Auto Clinic',
  'fatima-fresh-foods': 'Fatima Fresh Foods',
  'danladi-carpentry': 'Danladi Carpentry & Furniture',
  'grace-hair-beauty': 'Grace Hair & Beauty',
  'emeka-paints': 'Emeka Paints & Finishes',
  'kure-market-grocery': 'Kure Market Provisions',
  'yusuf-borehole': 'Yusuf Plumbing & Borehole',
  'swift-wheels': 'Swift Wheels Logistics',
  'paiko-cool-electrical': 'Paiko Cool Electrical',
  'suleja-power-electrical': 'Suleja Power Electricals',
  'abdullahi-mechanic': 'Abdullahi Mechanic Works',
  'chidi-carpentry': 'Chidi Woodworks',
  'bida-royal-tailors': 'Bida Royal Tailors',
  'kontagora-fresh-mart': 'Kontagora Fresh Mart',
  'bosso-greens': 'Bosso Greens & Grains',
  'sadiya-stitches': 'Sadiya Stitches'
};

interface Seed {
  id: string;
  kind: ModerationKind;
  source: ModerationSource;
  vendorId: string;
  hours: number;
  imageUrl?: string;
  text?: string;
  title?: string;
  price?: number;
  targetId: string;
  reason: string;
  reportedBy?: string;
  reportCount?: number;
  duplicateOf?: string;
  postedBy?: {name: string;role: 'vendor' | 'customer';};
}

function item(s: Seed): ModerationItem {
  return {
    id: s.id,
    kind: s.kind,
    source: s.source,
    status: MODERATION_STATUS.Pending,
    vendorId: s.vendorId,
    vendorName: NAMES[s.vendorId] ?? s.vendorId,
    postedBy: s.postedBy ?? { name: NAMES[s.vendorId] ?? s.vendorId, role: 'vendor' },
    content: { imageUrl: s.imageUrl ?? null, text: s.text ?? null, title: s.title ?? null, price: s.price ?? null, rating: null, targetId: s.targetId },
    flag: {
      reason: s.reason,
      reportedBy: s.reportedBy ?? null,
      reportCount: s.reportCount ?? (s.source === MODERATION_SOURCE.UserReport ? 1 : 0),
      keywords: [],
      duplicateOf: s.duplicateOf ? { vendorName: NAMES[s.duplicateOf] ?? s.duplicateOf, imageUrl: s.imageUrl ?? '' } : null
    },
    createdAt: hoursAgo(s.hours),
    decision: null,
    appeal: null,
    previous: null
  };
}

const { ProfilePhoto, Review, Product, PortfolioPhoto } = MODERATION_KIND;
const { NewUpload, UserReport, KeywordFlag, DuplicateImage } = MODERATION_SOURCE;

const newPhoto = (id: string, vendorId: string, imageUrl: string, hours: number) =>
item({ id, kind: ProfilePhoto, source: NewUpload, vendorId, hours, imageUrl, targetId: imageUrl, reason: 'New profile photo waiting for review before it goes live.' });

const dupPhoto = (id: string, vendorId: string, imageUrl: string, duplicateOf: string, hours: number) =>
item({ id, kind: ProfilePhoto, source: DuplicateImage, vendorId, hours, imageUrl, targetId: imageUrl, duplicateOf, reason: 'The same image is the profile photo of another vendor.' });

const flaggedReview = (n: number, vendorId: string, hours: number) =>
item({ id: `mod-rv${n}`, kind: Review, source: KeywordFlag, vendorId, hours, targetId: `flag-r${n}`, reason: 'Matched the keyword list after it went live.' });

export const mockModerationItems: ModerationItem[] = [
/* ---------- Profile photos: new uploads and duplicate-image flags ---------- */
newPhoto('mod-p1', 'emeka-paints', IMG.tank, 2),
newPhoto('mod-p2', 'kure-market-grocery', IMG.bike, 3),
newPhoto('mod-p3', 'swift-wheels', IMG.bike, 5),
newPhoto('mod-p4', 'sadiya-stitches', IMG.fabric, 7),
newPhoto('mod-p5', 'hauwa-tailoring', IMG.fabric, 9),
newPhoto('mod-p6', 'zainab-dispatch', IMG.tap, 11),
newPhoto('mod-p7', 'chidi-carpentry', IMG.tools, 13),
newPhoto('mod-p8', 'bosso-greens', IMG.pump, 15),
dupPhoto('mod-p9', 'musa-auto-clinic', IMG.tools, 'bala-plumbing', 18),
dupPhoto('mod-p10', 'danladi-carpentry', IMG.tools, 'bala-plumbing', 20),
dupPhoto('mod-p11', 'fatima-fresh-foods', IMG.bike, 'zainab-dispatch', 22),
dupPhoto('mod-p12', 'kontagora-fresh-mart', IMG.bike, 'zainab-dispatch', 26),
dupPhoto('mod-p13', 'grace-hair-beauty', IMG.fabric, 'hauwa-tailoring', 30),
dupPhoto('mod-p14', 'sadiya-stitches', IMG.fabric, 'hauwa-tailoring', 34),
dupPhoto('mod-p15', 'suleja-power-electrical', IMG.electrical, 'ibrahim-electrical', 38),
dupPhoto('mod-p16', 'paiko-cool-electrical', IMG.electrical, 'ibrahim-electrical', 44),

/* ---------- Reviews: keyword flags (the flagged reviews in public-profile/mock) ---------- */
flaggedReview(1, 'bala-plumbing', 5),
flaggedReview(2, 'musa-auto-clinic', 9),
flaggedReview(3, 'hauwa-tailoring', 14),
flaggedReview(4, 'grace-hair-beauty', 20),
flaggedReview(5, 'emeka-paints', 26),
flaggedReview(6, 'ibrahim-electrical', 31),
flaggedReview(7, 'danladi-carpentry', 38),
flaggedReview(8, 'zainab-dispatch', 44),
flaggedReview(9, 'swift-wheels', 52),
flaggedReview(10, 'yusuf-borehole', 60),
flaggedReview(11, 'sadiya-stitches', 70),
flaggedReview(12, 'abdullahi-mechanic', 80),
flaggedReview(13, 'chidi-carpentry', 90),
flaggedReview(14, 'bida-royal-tailors', 100),
flaggedReview(15, 'paiko-cool-electrical', 110),
flaggedReview(16, 'suleja-power-electrical', 120),

/* ---------- Catalogue: new product listings, duplicate images, portfolio photos ---------- */
item({ id: 'mod-c1', kind: Product, source: NewUpload, vendorId: 'bala-plumbing', hours: 4, targetId: 'p1', reason: 'New product listing.' }),
item({ id: 'mod-c2', kind: Product, source: NewUpload, vendorId: 'bala-plumbing', hours: 6, targetId: 'p2', reason: 'New product listing.' }),
item({ id: 'mod-c3', kind: Product, source: NewUpload, vendorId: 'bala-plumbing', hours: 8, targetId: 'p3', reason: 'New product listing.' }),
item({ id: 'mod-c4', kind: Product, source: NewUpload, vendorId: 'bala-plumbing', hours: 10, targetId: 'p4', reason: 'New product listing.' }),
item({ id: 'mod-c5', kind: Product, source: NewUpload, vendorId: 'hauwa-tailoring', hours: 12, targetId: 'p11', reason: 'New product listing.' }),
item({ id: 'mod-c6', kind: Product, source: NewUpload, vendorId: 'hauwa-tailoring', hours: 16, targetId: 'p12', reason: 'New product listing.' }),
item({ id: 'mod-c7', kind: Product, source: NewUpload, vendorId: 'hauwa-tailoring', hours: 19, targetId: 'p13', reason: 'New product listing.' }),
item({ id: 'mod-c8', kind: Product, source: NewUpload, vendorId: 'ibrahim-electrical', hours: 23, targetId: 'p21', reason: 'New product listing.' }),
item({ id: 'mod-c9', kind: Product, source: DuplicateImage, vendorId: 'fatima-fresh-foods', hours: 27, targetId: 'fatima-fresh-foods-p3', duplicateOf: 'kure-market-grocery', imageUrl: IMG.bike, reason: 'The product photo is used by another vendor.' }),
item({ id: 'mod-c10', kind: Product, source: DuplicateImage, vendorId: 'kure-market-grocery', hours: 31, targetId: 'kure-market-grocery-p4', duplicateOf: 'fatima-fresh-foods', imageUrl: IMG.bike, reason: 'The product photo is used by another vendor.' }),
item({ id: 'mod-c11', kind: Product, source: DuplicateImage, vendorId: 'bosso-greens', hours: 35, targetId: 'bosso-greens-p3', duplicateOf: 'fatima-fresh-foods', imageUrl: IMG.bike, reason: 'The product photo is used by another vendor.' }),
item({ id: 'mod-c12', kind: PortfolioPhoto, source: NewUpload, vendorId: 'bala-plumbing', hours: 40, imageUrl: IMG.tap, targetId: IMG.tap, reason: 'New portfolio photo.' }),
item({ id: 'mod-c13', kind: PortfolioPhoto, source: NewUpload, vendorId: 'bala-plumbing', hours: 41, imageUrl: IMG.pump, targetId: IMG.pump, reason: 'New portfolio photo.' }),
item({ id: 'mod-c14', kind: PortfolioPhoto, source: DuplicateImage, vendorId: 'bala-plumbing', hours: 42, imageUrl: IMG.tank, targetId: IMG.tank, duplicateOf: 'emeka-paints', reason: 'The same photo is another vendor’s profile photo.' }),
item({ id: 'mod-c15', kind: PortfolioPhoto, source: DuplicateImage, vendorId: 'hauwa-tailoring', hours: 46, imageUrl: IMG.fabric, targetId: IMG.fabric, duplicateOf: 'bida-royal-tailors', reason: 'The same photo is in another vendor’s portfolio.' }),
item({ id: 'mod-c16', kind: PortfolioPhoto, source: DuplicateImage, vendorId: 'ibrahim-electrical', hours: 50, imageUrl: IMG.electrical, targetId: IMG.electrical, duplicateOf: 'suleja-power-electrical', reason: 'The same photo is in another vendor’s portfolio.' }),

/* ---------- Reported by users ---------- */
item({ id: 'mod-r1', kind: Review, source: UserReport, vendorId: 'hauwa-tailoring', hours: 3, targetId: 'hauwa-tailoring-r2', reason: 'Vendor says this customer never booked with them.', reportedBy: 'Hauwa Tailoring & Ankara (vendor)' }),
item({ id: 'mod-r2', kind: Review, source: UserReport, vendorId: 'ibrahim-electrical', hours: 6, targetId: 'ibrahim-electrical-r3', reason: 'Vendor says the review is about a different electrician.', reportedBy: 'Ibrahim Electrical Works (vendor)' }),
item({ id: 'mod-r3', kind: Review, source: UserReport, vendorId: 'musa-auto-clinic', hours: 10, targetId: 'musa-auto-clinic-r1', reason: 'Offensive language.', reportedBy: 'Musa Auto Clinic (vendor)' }),
item({ id: 'mod-r4', kind: Review, source: UserReport, vendorId: 'zainab-dispatch', hours: 15, targetId: 'zainab-dispatch-r4', reason: 'Spam: the same text posted several times.', reportedBy: 'Zainab Swift Dispatch (vendor)' }),
item({ id: 'mod-r5', kind: Review, source: UserReport, vendorId: 'grace-hair-beauty', hours: 21, targetId: 'grace-hair-beauty-r2', reason: 'Not a real customer.', reportedBy: 'Grace Hair & Beauty (vendor)', reportCount: 2 }),
item({ id: 'mod-r6', kind: Review, source: UserReport, vendorId: 'yusuf-borehole', hours: 27, targetId: 'yusuf-borehole-r5', reason: 'The reviewer is a competitor.', reportedBy: 'Yusuf Plumbing & Borehole (vendor)' }),
item({ id: 'mod-r7', kind: Review, source: UserReport, vendorId: 'danladi-carpentry', hours: 33, targetId: 'danladi-carpentry-r3', reason: 'Mentions a job that never happened.', reportedBy: 'Danladi Carpentry & Furniture (vendor)' }),
item({ id: 'mod-r8', kind: Review, source: UserReport, vendorId: 'emeka-paints', hours: 39, targetId: 'emeka-paints-r1', reason: 'Offensive language.', reportedBy: 'Emeka Paints & Finishes (vendor)' }),
item({ id: 'mod-r9', kind: Product, source: UserReport, vendorId: 'fatima-fresh-foods', hours: 8, targetId: 'fatima-fresh-foods-p4', reason: 'The groundnut oil delivered was 2L, not 3L as listed.', reportedBy: 'Ngozi Adeyemi (customer)', reportCount: 3 }),
item({ id: 'mod-r10', kind: Product, source: UserReport, vendorId: 'kure-market-grocery', hours: 14, targetId: 'kure-market-grocery-p2', reason: 'Listed as a pack of 12 but sold as a pack of 6.', reportedBy: 'Halima Yusuf (customer)' }),
item({ id: 'mod-r11', kind: Product, source: UserReport, vendorId: 'ibrahim-electrical', hours: 24, targetId: 'p22', reason: 'Price in the shop is higher than the listing.', reportedBy: 'Usman Bello (customer)' }),
item({ id: 'mod-r12', kind: Product, source: UserReport, vendorId: 'bosso-greens', hours: 30, targetId: 'bosso-greens-p1', reason: 'Photo doesn’t show tomatoes.', reportedBy: 'Aisha Mohammed (customer)' }),
item({ id: 'mod-r13', kind: ProfilePhoto, source: UserReport, vendorId: 'yusuf-borehole', hours: 36, imageUrl: IMG.pump, targetId: IMG.pump, reason: 'The photo shows another company’s drilling rig.', reportedBy: 'Ibrahim Sule (customer)' }),
item({ id: 'mod-r14', kind: ProfilePhoto, source: UserReport, vendorId: 'ibrahim-electrical', hours: 48, imageUrl: IMG.electrical, targetId: IMG.electrical, reason: 'Stock photo from the internet.', reportedBy: 'Paiko Cool Electrical (vendor)' }),
item({ id: 'mod-r15', kind: PortfolioPhoto, source: UserReport, vendorId: 'zainab-dispatch', hours: 54, imageUrl: IMG.bike, targetId: IMG.bike, reason: 'Not her bike: it’s a photo from Swift Wheels.', reportedBy: 'Swift Wheels Logistics (vendor)' }),
item({ id: 'mod-r16', kind: PortfolioPhoto, source: UserReport, vendorId: 'bala-plumbing', hours: 60, imageUrl: IMG.tools, targetId: IMG.tools, reason: 'Same photo as several other vendors.', reportedBy: 'Musa Kabiru (customer)' })];


/** Already removed, with the vendor's appeal waiting (the service applies the removal on start-up). */
export const mockAppealedItems: (ModerationItem & {removedHoursAgo: number;appealHoursAgo: number;appealMessage: string;removalReason: string;})[] = [
{
  ...item({ id: 'mod-a1', kind: PortfolioPhoto, source: DuplicateImage, vendorId: 'danladi-carpentry', hours: 4 * DAY, imageUrl: IMG.tools, targetId: IMG.tools, duplicateOf: 'bala-plumbing', reason: 'The same photo is in another vendor’s portfolio.' }),
  removedHoursAgo: 3 * DAY,
  appealHoursAgo: 2 * DAY,
  removalReason: 'Misleading, fake or not the vendor’s own work',
  appealMessage: 'This is a photo of my own workshop tools. Bala bought the same toolkit from my shop. I can send more photos taken the same day.'
},
{
  ...item({ id: 'mod-a2', kind: ProfilePhoto, source: DuplicateImage, vendorId: 'abdullahi-mechanic', hours: 5 * DAY, imageUrl: IMG.tools, targetId: IMG.tools, duplicateOf: 'bala-plumbing', reason: 'The same image is the profile photo of another vendor.' }),
  removedHoursAgo: 4 * DAY,
  appealHoursAgo: 3 * DAY,
  removalReason: 'Misleading, fake or not the vendor’s own work',
  appealMessage: 'I didn’t know this photo was used by someone else. Please put it back while I take a new one.'
},
{
  ...item({ id: 'mod-a3', kind: Product, source: UserReport, vendorId: 'kure-market-grocery', hours: 3 * DAY, targetId: 'kure-market-grocery-p3', reason: 'Soap sold as a pack of 6 but only 4 inside.', reportedBy: 'Halima Yusuf (customer)' }),
  removedHoursAgo: 2 * DAY,
  appealHoursAgo: 30,
  removalReason: 'Misleading, fake or not the vendor’s own work',
  appealMessage: 'The supplier changed the pack. I have updated the description to 4 bars. Please put the listing back.'
},
{
  ...item({ id: 'mod-a4', kind: PortfolioPhoto, source: NewUpload, vendorId: 'chidi-carpentry', hours: 6 * DAY, imageUrl: IMG.tools, targetId: IMG.tools, reason: 'New portfolio photo.' }),
  removedHoursAgo: 5 * DAY,
  appealHoursAgo: 4 * DAY,
  removalReason: 'Inappropriate or low-quality image',
  appealMessage: 'It is a close-up of the joints on a wardrobe I built. I can upload a clearer one but please keep this one.'
}];


/** Decided earlier (for the "Decided" view and the audit trail). */
export const mockDecidedItems: ModerationItem[] = [
{
  ...item({ id: 'mod-d1', kind: ProfilePhoto, source: NewUpload, vendorId: 'bida-royal-tailors', hours: 9 * DAY, imageUrl: IMG.fabric, targetId: IMG.fabric, reason: 'New profile photo waiting for review before it goes live.' }),
  status: MODERATION_STATUS.Approved,
  decision: { action: 'approved', reason: null, by: 'Ifeoma Obi', at: hoursAgo(8 * DAY) }
}];
