/*
 * The public landing page (features/landing): section ids, header links, photos and the palette.
 *
 * ⚠️ PLACEHOLDER COPY: every text on the page lives in src/locales/<lang>/landing.json. The headline, the
 * FAQ answers and the footer (contact, terms, privacy, social links) are drafts to confirm with the team.
 * Numbers on the page (stats, counts, ratings, reply times) and the review quotes come from the app's
 * data through services/landingService.ts, never from made-up figures.
 */

export const LANDING_SECTION = {
  HowItWorks: 'how-it-works',
  Categories: 'categories',
  Providers: 'for-providers',
  Faq: 'faq'
} as const;

export type LandingSectionId = (typeof LANDING_SECTION)[keyof typeof LANDING_SECTION];

/** The header's section links, in page order, with their label key under landing:nav. */
export const LANDING_NAV: readonly {id: LandingSectionId;labelKey: string;}[] = [
{ id: LANDING_SECTION.HowItWorks, labelKey: 'nav.howItWorks' },
{ id: LANDING_SECTION.Categories, labelKey: 'nav.categories' },
{ id: LANDING_SECTION.Providers, labelKey: 'nav.providers' },
{ id: LANDING_SECTION.Faq, labelKey: 'nav.faq' }];


/** FAQ entries, by key under landing:faq. */
export const LANDING_FAQ = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const;

/** id of <main>, the skip link's target. */
export const MAIN_ID = 'main-content';

/**
 * Confirmed marketing figures can replace the live counts in the stats row. Leave null to show what the
 * data says. Only set a number here once it's true (e.g. after launch, from real accounts).
 */
export const LANDING_STATS_OVERRIDE: {providers: number | null;reviews: number | null;} = { providers: null, reviews: null };

/**
 * Photos: the app's own Nigerian-context photos, re-saved small for slow mobile data (public/landing/
 * photos, 480 and 800 px, ~25–115 KB). Square, so they crop the same everywhere.
 */
const photo = (name: string) => ({ small: `/landing/photos/${name}-480.jpg`, large: `/landing/photos/${name}-800.jpg`, size: 800 });
export const LANDING_PHOTOS = {
  tailor: photo('tailor'),
  electrician: photo('electrician'),
  market: photo('market-rider'),
  plumber: photo('plumber'),
  borehole: photo('borehole')
} as const;

/** Vendor profile photos that have a small landing copy (the card shows that instead of the 1024 px original). */
export const COMPRESSED_VENDOR_PHOTOS: Record<string, string> = {
  '/5f3ebb40-48fe-44e2-93d2-54fbf5cc1df0.jpg': '/landing/photos/market-rider-480.jpg',
  '/7b603249-287d-4774-a819-d321f37568b0.jpg': '/landing/photos/borehole-480.jpg',
  '/7dc19955-5e58-4910-a155-bea401f35289.jpg': '/landing/photos/plumber-480.jpg',
  '/8cea2981-0ed5-4d4d-aa23-828c0576dded.jpg': '/landing/photos/electrician-480.jpg',
  '/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg': '/landing/photos/tailor-480.jpg',
  '/a9d11f11-7784-4fed-80c6-44c46b6c48d4.jpg': '/landing/photos/pipes-480.jpg',
  '/b5817d72-46c7-4bc6-9b8d-d3a4479a8955.jpg': '/landing/photos/water-tank-480.jpg'
};

/**
 * The landing palette: the brand colours (cream, deep teal, orange, gold) plus soft tints for the
 * alternating section backgrounds. The orange used behind white text is a shade darker than the brand
 * orange so button text meets WCAG AA contrast (4.5:1).
 */
export const LANDING_COLORS = {
  cream: '#FAF6EE',
  tealTint: '#E8F1EF',
  orangeTint: '#FCEFE6',
  goldTint: '#F8EED2',
  teal: '#1F4B4D',
  tealDeep: '#163A3C',
  tealNight: '#102D2F',
  orange: '#CF5A2E',
  orangeButton: '#C0501F',
  orangeButtonHover: '#A8441D',
  gold: '#D9A933'
} as const;

/**
 * The hero image (public/landing, WebP). ⚠️ TEMPORARY: a crop of the reference design, standing in until
 * the real hero-right image is added. To swap it, replace both files (same names) and update the sizes.
 */
export const HERO_IMAGE = {
  small: '/landing/hero-right-620.webp',
  smallWidth: 620,
  large: '/landing/hero-right-937.webp',
  largeWidth: 937,
  largeHeight: 940
} as const;
