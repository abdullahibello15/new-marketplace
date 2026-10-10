import { addDays, format } from 'date-fns';
import { DEMO_CUSTOMER } from '../../auth/mock/users';
import type { NigerLga } from '../../../types/marketplace';
import type {
  Job,
  JobActor,
  JobAddress,
  JobArrival,
  JobCancellation,
  JobDispute,
  JobQuote,
  JobReview,
  JobStatus,
  JobStatusChange,
  RescheduleRequest,
  TimeWindow } from
'../types';

/* Mock jobs, relative to today so the demo always looks current. One store serves both apps:
 * the customer (Aisha) sees her jobs; Bala Plumbing sees every job sent to him, including hers. */

function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
const day = (dayOffset: number) => format(addDays(new Date(), dayOffset), 'yyyy-MM-dd');
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const step = (status: JobStatus, when: string, by: JobActor, note?: string): JobStatusChange => ({ status, at: when, by, ...(note ? { note } : {}) });

const address = (landmark: string, placeId: string, placeLabel: string, lga: NigerLga): JobAddress => ({
  landmark,
  placeId,
  placeLabel,
  lga,
  coordinates: null
});

const quote = (amount: number, includes: string, durationHours: number, proposedStart: string, expiresAt: string, sentAt: string): JobQuote => ({
  amount,
  includes,
  durationHours,
  proposedStart,
  expiresAt,
  sentAt
});

interface Seed {
  id: string;
  vendorId: string;
  vendorName: string;
  customerName: string;
  serviceName: string | null;
  description: string;
  photos?: string[];
  preferredDate: string;
  timeWindow: TimeWindow;
  address: JobAddress;
  history: JobStatusChange[];
  quote?: JobQuote;
  arrival?: JobArrival;
  reschedules?: RescheduleRequest[];
  review?: JobReview;
  dispute?: JobDispute;
  cancellation?: JobCancellation;
  /** Copy the quote's start and price as the agreed booking. */
  booked?: boolean;
}

function job(seed: Seed): Job {
  const last = seed.history[seed.history.length - 1];
  const isAisha = seed.customerName === DEMO_CUSTOMER.name;
  return {
    id: seed.id,
    vendorId: seed.vendorId,
    vendorName: seed.vendorName,
    customerId: isAisha ? DEMO_CUSTOMER.id : `cust-${seed.customerName.toLowerCase().replace(/[^a-z]+/g, '-')}`,
    customerName: seed.customerName,
    serviceName: seed.serviceName,
    description: seed.description,
    photos: seed.photos ?? [],
    preferredDate: seed.preferredDate,
    timeWindow: seed.timeWindow,
    address: seed.address,
    status: last.status,
    history: seed.history,
    quote: seed.quote ?? null,
    scheduledAt: seed.booked && seed.quote ? seed.quote.proposedStart : null,
    agreedPrice: seed.booked && seed.quote ? seed.quote.amount : null,
    arrival: seed.arrival ?? null,
    reschedules: seed.reschedules ?? [],
    dispute: seed.dispute ?? null,
    review: seed.review ?? null,
    cancellation: seed.cancellation ?? null,
    createdAt: seed.history[0].at,
    updatedAt: last.at
  };
}

const IMG = {
  tap: '/a9d11f11-7784-4fed-80c6-44c46b6c48d4.jpg',
  pump: '/7b603249-287d-4774-a819-d321f37568b0.jpg',
  tank: '/b5817d72-46c7-4bc6-9b8d-d3a4479a8955.jpg',
  tools: '/7dc19955-5e58-4910-a155-bea401f35289.jpg',
  fabric: '/a149d194-c7e0-476e-aee4-cd560be7cc60.jpg',
  electrical: '/8cea2981-0ed5-4d4d-aa23-828c0576dded.jpg'
};

const BALA = { vendorId: 'bala-plumbing', vendorName: 'Bala Plumbing Services' };
const AISHA_HOME = address('Behind NEPA office, blue gate', 'town-tunga', 'Tunga, Minna', 'Chanchaga');

export const mockJobs: Job[] = [
/* ---------- Aisha's jobs (the customer app) ---------- */
job({
  id: '2291',
  ...BALA,
  customerName: DEMO_CUSTOMER.name,
  serviceName: 'Pipe fitting & repair',
  description: 'Kitchen tap is leaking and drips even when fully closed. Probably needs a new washer or a new tap.',
  photos: [IMG.tap],
  preferredDate: day(1),
  timeWindow: 'morning',
  address: AISHA_HOME,
  quote: quote(6500, 'New washer or replacement tap if needed, labour and clean-up.', 1, at(1, 10), at(1, 8), at(-1, 12)),
  booked: true,
  // One reschedule already used (declined), so one is left.
  reschedules: [
  {
    id: 'rs-2291-1',
    requestedBy: 'vendor',
    fromStart: at(1, 10),
    proposedStart: at(1, 16),
    reason: 'Another job in Bosso is running long. Could we move to the afternoon?',
    status: 'declined',
    createdAt: at(-1, 17),
    respondedAt: at(-1, 18)
  }],

  history: [step('requested', at(-2, 9), 'customer'), step('quoted', at(-1, 12), 'vendor'), step('scheduled', at(-1, 15), 'customer')]
}),
job({
  id: '2284',
  vendorId: 'hauwa-tailoring',
  vendorName: 'Hauwa Tailoring & Ankara',
  customerName: DEMO_CUSTOMER.name,
  serviceName: 'Aso-ebi set',
  description: 'Two aso-ebi outfits for a wedding. Ankara fabric already bought, need measuring at home.',
  photos: [IMG.fabric],
  preferredDate: day(-12),
  timeWindow: 'afternoon',
  address: AISHA_HOME,
  quote: quote(18000, 'Measuring at home, sewing two outfits, one fitting.', 16, at(-12, 14), at(-12, 9), at(-13, 10)),
  booked: true,
  history: [
  step('requested', at(-14, 11), 'customer'),
  step('quoted', at(-13, 10), 'vendor'),
  step('scheduled', at(-13, 18), 'customer'),
  step('in_progress', at(-12, 14), 'vendor'),
  step('awaiting_confirmation', at(-5, 16), 'vendor'),
  step('completed', at(-5, 19), 'customer'),
  step('closed', at(-5, 19, 5), 'customer', 'Left a 5★ review')],
  review: { rating: 5, comment: 'Beautiful work and ready a day early. The fitting at home saved me a trip.', at: at(-5, 19, 5) }

}),
// Cancelled late after paying by card: refunded less the late-cancellation fee (payment GW-SEED-2280).
job({
  id: '2280',
  vendorId: 'ibrahim-electrical',
  vendorName: 'Ibrahim Electrical Works',
  customerName: DEMO_CUSTOMER.name,
  serviceName: 'Ceiling fan installation',
  description: 'Install a new ceiling fan in the sitting room. The fan and the bracket are already bought.',
  preferredDate: day(-25),
  timeWindow: 'morning',
  address: AISHA_HOME,
  quote: quote(8000, 'Mounting, wiring to the existing point, testing, labour.', 2, at(-25, 10), at(-27, 9), at(-28, 15)),
  booked: true,
  cancellation: {
    by: 'customer',
    at: at(-25, 8),
    reason: 'The time no longer works for me',
    fee: 1600,
    rule: 'late'
  },
  history: [
  step('requested', at(-28, 11), 'customer'),
  step('quoted', at(-28, 15), 'vendor'),
  step('scheduled', at(-27, 12), 'customer'),
  step('cancelled', at(-25, 8), 'customer', 'The time no longer works for me')]

}),
job({
  id: '2302',
  vendorId: 'ibrahim-electrical',
  vendorName: 'Ibrahim Electrical Works',
  customerName: DEMO_CUSTOMER.name,
  serviceName: 'Fault tracing & repair',
  description: 'Two sockets in the living room spark when something is plugged in, and the breaker trips at night.',
  photos: [IMG.electrical],
  preferredDate: day(2),
  timeWindow: 'afternoon',
  address: AISHA_HOME,
  quote: quote(9000, 'Fault tracing, two replacement sockets, labour.', 2, at(2, 14), hoursFromNow(40), at(0, 8)),
  history: [step('requested', at(-1, 19), 'customer'), step('quoted', at(0, 8), 'vendor')]
}),
job({
  id: '2306',
  vendorId: 'zainab-dispatch',
  vendorName: 'Zainab Swift Dispatch',
  customerName: DEMO_CUSTOMER.name,
  serviceName: 'Market pickup',
  description: 'Please buy a 25kg bag of rice and 5 litres of groundnut oil from Kure market and deliver to my house.',
  preferredDate: day(1),
  timeWindow: 'morning',
  address: AISHA_HOME,
  history: [step('requested', hoursFromNow(-2), 'customer')]
}),
job({
  id: '2299',
  vendorId: 'musa-auto-clinic',
  vendorName: 'Musa Auto Clinic',
  customerName: DEMO_CUSTOMER.name,
  serviceName: 'Car AC regas',
  description: 'Car AC is blowing warm air since last week. Toyota Corolla 2010. Can bring it to the workshop.',
  preferredDate: day(-1),
  timeWindow: 'anytime',
  address: AISHA_HOME,
  // Expired quote: Accept and Reject are disabled.
  quote: quote(15000, 'Leak test, AC gas top-up, labour.', 2, at(0, 11), at(-1, 18), at(-3, 10)),
  history: [step('requested', at(-4, 16), 'customer'), step('quoted', at(-3, 10), 'vendor')]
}),
job({
  id: '2288',
  vendorId: 'emeka-paints',
  vendorName: 'Emeka Paints & Finishes',
  customerName: DEMO_CUSTOMER.name,
  serviceName: 'Room painting',
  description: 'Repaint the sitting room, about 4m by 5m. Walls are in good condition, just faded.',
  preferredDate: day(-6),
  timeWindow: 'morning',
  address: AISHA_HOME,
  quote: quote(45000, 'Two coats of emulsion, filler, labour. Customer buys paint.', 8, at(-6, 9), at(-7, 18), at(-8, 12)),
  history: [
  step('requested', at(-9, 10), 'customer'),
  step('quoted', at(-8, 12), 'vendor'),
  step('quote_rejected', at(-8, 19), 'customer', 'Found someone closer to my budget.')]

}),

job({
  // Work done 3 hours ago: Aisha can confirm or report a problem.
  id: '2297',
  ...BALA,
  customerName: DEMO_CUSTOMER.name,
  serviceName: 'Pipe fitting & repair',
  description: 'Shower head is blocked and the pipe behind it rattles. Water barely comes out upstairs.',
  photos: [IMG.tools],
  preferredDate: day(0),
  timeWindow: 'morning',
  address: AISHA_HOME,
  quote: quote(8000, 'New shower head, pipe bracket, labour.', 2, hoursFromNow(-6), hoursFromNow(-30), hoursFromNow(-50)),
  booked: true,
  arrival: { at: hoursFromNow(-5.8), locationLabel: 'near Tunga, Minna', coordinates: null },
  history: [
  step('requested', hoursFromNow(-60), 'customer'),
  step('quoted', hoursFromNow(-50), 'vendor'),
  step('scheduled', hoursFromNow(-48), 'customer'),
  step('in_progress', hoursFromNow(-5.8), 'vendor'),
  step('awaiting_confirmation', hoursFromNow(-3), 'vendor')]

}),
job({
  // Work done 50 hours ago with no reply: the platform auto-confirms it the first time jobs are loaded.
  id: '2293',
  vendorId: 'hauwa-tailoring',
  vendorName: 'Hauwa Tailoring & Ankara',
  customerName: DEMO_CUSTOMER.name,
  serviceName: 'Alterations',
  description: 'Take in two kaftans at the waist and shorten the sleeves by about 3cm on both.',
  preferredDate: day(-4),
  timeWindow: 'afternoon',
  address: AISHA_HOME,
  quote: quote(4000, 'Alterations to two kaftans, collection and drop-off.', 4, at(-4, 13), at(-5, 12), at(-6, 9)),
  booked: true,
  history: [
  step('requested', at(-7, 10), 'customer'),
  step('quoted', at(-6, 9), 'vendor'),
  step('scheduled', at(-6, 11), 'customer'),
  step('in_progress', at(-4, 13), 'vendor'),
  step('awaiting_confirmation', hoursFromNow(-50), 'vendor')]

}),

/* ---------- Other customers' jobs for Bala Plumbing (the vendor dashboard) ---------- */
job({
  // Starts in 40 minutes, so "I've arrived / Start job" is already enabled.
  id: '2324',
  ...BALA,
  customerName: 'Usman Bello',
  serviceName: 'Pipe fitting & repair',
  description: 'Burst pipe under the kitchen sink. The water is turned off at the main valve for now.',
  photos: [IMG.tap],
  preferredDate: day(0),
  timeWindow: 'anytime',
  address: address('Tudun Wada, opposite the pharmacy, brown gate', 'town-tudun-wada', 'Tudun Wada, Minna', 'Chanchaga'),
  quote: quote(7000, 'Cut out and replace the burst section, fittings, labour.', 1, hoursFromNow(0.67), hoursFromNow(-2), hoursFromNow(-5)),
  booked: true,
  history: [step('requested', hoursFromNow(-6), 'customer'), step('quoted', hoursFromNow(-5), 'vendor'), step('scheduled', hoursFromNow(-4), 'customer')]
}),
job({
  id: '2310',
  ...BALA,
  customerName: 'Musa Kabiru',
  serviceName: 'Borehole pump installation',
  description: 'Borehole pump hums but no water comes out. It is a 1HP surface pump, about four years old.',
  photos: [IMG.pump],
  preferredDate: day(2),
  timeWindow: 'morning',
  address: address('Opposite Bosso market, white bungalow', 'town-bosso-estate', 'Bosso Estate, Minna', 'Bosso'),
  history: [step('requested', hoursFromNow(-0.4), 'customer')]
}),
job({
  id: '2311',
  ...BALA,
  customerName: 'Ibrahim Sani',
  serviceName: 'Pipe fitting & repair',
  description: 'Replace the old galvanised pipes in the bathroom. There is rust in the water and low pressure.',
  photos: [IMG.tools, IMG.tank],
  preferredDate: day(5),
  timeWindow: 'afternoon',
  address: address('Close to Chanchaga junction, after the mosque', 'lga-chanchaga', 'Chanchaga, Minna', 'Chanchaga'),
  history: [step('requested', hoursFromNow(-3), 'customer')]
}),
job({
  id: '2312',
  ...BALA,
  customerName: 'Blessing Okafor',
  serviceName: null,
  description: 'Very low water pressure upstairs. Downstairs is fine. The overhead tank is full.',
  preferredDate: day(3),
  timeWindow: 'anytime',
  address: address('Maitumbi, beside Living Faith church', 'town-maitumbi', 'Maitumbi, Minna', 'Bosso'),
  history: [step('requested', hoursFromNow(-20), 'customer')]
}),
job({
  id: '2313',
  ...BALA,
  customerName: 'Ngozi Adeyemi',
  serviceName: 'Water tank installation',
  description: '2,000L water tank installation. The tank stand is already built and the tank is on site.',
  photos: [IMG.tank],
  preferredDate: day(3),
  timeWindow: 'afternoon',
  address: address('Maitumbi, last house on the street with the borehole', 'town-maitumbi', 'Maitumbi, Minna', 'Bosso'),
  quote: quote(35000, 'Tank connection to main line, overflow and outlet fittings, labour.', 4, at(3, 13), at(1, 12), at(-1, 12)),
  booked: true,
  history: [step('requested', at(-2, 8), 'customer'), step('quoted', at(-1, 12), 'vendor'), step('scheduled', at(-1, 17), 'customer')]
}),
job({
  id: '2314',
  ...BALA,
  customerName: 'Halima Yusuf',
  serviceName: 'Pipe fitting & repair',
  description: 'Install a new shower mixer. I have already bought the mixer, need it fitted and tested.',
  preferredDate: day(1),
  timeWindow: 'afternoon',
  address: address('Kpakungu, behind the filling station', 'town-kpakungu', 'Kpakungu, Minna', 'Chanchaga'),
  quote: quote(15000, 'Fitting and testing the mixer, sealing, labour.', 2, at(1, 14), at(0, 12), at(-2, 9)),
  booked: true,
  // The customer asked to move it; waiting for Bala to accept or decline.
  reschedules: [
  {
    id: 'rs-2314-1',
    requestedBy: 'customer',
    fromStart: at(1, 14),
    proposedStart: at(2, 10),
    reason: 'I’ll be at work tomorrow afternoon. Can you come the next morning instead?',
    status: 'pending',
    createdAt: hoursFromNow(-3),
    respondedAt: null
  }],

  history: [step('requested', at(-3, 18), 'customer'), step('quoted', at(-2, 9), 'vendor'), step('scheduled', at(-2, 13), 'customer')]
}),
job({
  id: '2315',
  ...BALA,
  customerName: 'Chinedu Okeke',
  serviceName: 'Pipe fitting & repair',
  description: 'Kitchen drain has been slow for a week. Water takes a long time to go down.',
  preferredDate: day(8),
  timeWindow: 'morning',
  address: address('Tunga, by the GTBank ATM', 'town-tunga', 'Tunga, Minna', 'Chanchaga'),
  quote: quote(5500, 'Drain unblocking, trap clean, labour.', 1, at(8, 9), at(5, 9), at(-1, 10)),
  booked: true,
  history: [step('requested', at(-2, 20), 'customer'), step('quoted', at(-1, 10), 'vendor'), step('scheduled', at(-1, 11), 'customer')]
}),
job({
  id: '2316',
  ...BALA,
  customerName: 'Fatima Bello',
  serviceName: 'Pipe fitting & repair',
  description: 'Damp patch on the bedroom wall next to the bathroom. I think a pipe is leaking inside the wall.',
  photos: [IMG.tools],
  preferredDate: day(0),
  timeWindow: 'afternoon',
  address: address('Bosso Estate, house 14, green roof', 'town-bosso-estate', 'Bosso Estate, Minna', 'Bosso'),
  quote: quote(9200, 'Leak tracing, opening and repairing the wall section, pipe repair.', 2, hoursFromNow(-1.25), at(-1, 12), at(-2, 15)),
  arrival: { at: hoursFromNow(-1), locationLabel: 'near Bosso Estate, Minna', coordinates: null },
  booked: true,
  // Paid by card (held in escrow), then disputed: the money stays held until Gwani resolves it.
  dispute: {
    reason: 'not_finished',
    details: 'The wall was opened but the leak is still there and the wall is wet again.',
    at: hoursFromNow(-0.3)
  },
  history: [
  step('requested', at(-3, 9), 'customer'),
  step('quoted', at(-2, 15), 'vendor'),
  step('scheduled', at(-2, 18), 'customer'),
  step('in_progress', hoursFromNow(-1), 'vendor'),
  step('disputed', hoursFromNow(-0.3), 'customer', 'The wall was opened but the leak is still there and the wall is wet again.')]

}),
job({
  id: '2317',
  ...BALA,
  customerName: 'Salisu Tanko',
  serviceName: 'Pipe fitting & repair',
  description: 'Toilet cistern keeps running after flushing and wastes a lot of water.',
  preferredDate: day(-2),
  timeWindow: 'morning',
  address: address('Kpakungu, opposite the primary school', 'town-kpakungu', 'Kpakungu, Minna', 'Chanchaga'),
  quote: quote(12000, 'New cistern valve and flush mechanism, labour.', 2, at(-2, 11), at(-3, 12), at(-4, 10)),
  booked: true,
  history: [
  step('requested', at(-5, 8), 'customer'),
  step('quoted', at(-4, 10), 'vendor'),
  step('scheduled', at(-4, 12), 'customer'),
  step('in_progress', at(-2, 11), 'vendor'),
  step('awaiting_confirmation', at(-2, 13), 'vendor'),
  step('completed', at(-2, 17), 'customer')]

}),
job({
  id: '2318',
  ...BALA,
  customerName: 'Grace Ibrahim',
  serviceName: 'Water tank installation',
  description: 'New 1,500L tank on the roof stand, connect to the house and add a float valve.',
  preferredDate: day(-6),
  timeWindow: 'morning',
  address: address('Tudun Wada, yellow duplex near the clinic', 'town-tudun-wada', 'Tudun Wada, Minna', 'Chanchaga'),
  quote: quote(33100, 'Installation, float valve, connections, labour.', 4, at(-6, 9), at(-7, 12), at(-8, 14)),
  booked: true,
  history: [
  step('requested', at(-9, 9), 'customer'),
  step('quoted', at(-8, 14), 'vendor'),
  step('scheduled', at(-8, 16), 'customer'),
  step('in_progress', at(-6, 9), 'vendor'),
  step('awaiting_confirmation', at(-6, 15), 'vendor'),
  step('completed', at(-6, 18), 'customer'),
  step('closed', at(-6, 18, 5), 'customer', 'Left a 4★ review')],
  review: { rating: 4, comment: 'Tank is in and working. Took longer than planned but they stayed to finish.', at: at(-6, 18, 5) }

}),
job({
  id: '2319',
  ...BALA,
  customerName: 'Emeka Nwosu',
  serviceName: null,
  description: 'Outside drain is blocked and smells. Water collects in the compound when it rains.',
  preferredDate: day(-1),
  timeWindow: 'morning',
  address: address('Chanchaga, behind the old market', 'lga-chanchaga', 'Chanchaga, Minna', 'Chanchaga'),
  quote: quote(5500, 'Drain unblocking and flushing, labour.', 1, at(-1, 9), at(-2, 9), at(-2, 7)),
  booked: true,
  history: [
  step('requested', at(-3, 19), 'customer'),
  step('quoted', at(-2, 7), 'vendor'),
  step('scheduled', at(-2, 8), 'customer'),
  step('in_progress', at(-1, 9), 'vendor'),
  step('awaiting_confirmation', at(-1, 10), 'vendor'),
  step('completed', at(-1, 12), 'customer')]

}),
job({
  id: '2320',
  ...BALA,
  customerName: 'Zainab Abubakar',
  serviceName: 'Pipe fitting & repair',
  description: 'Install an outside tap in the compound for washing the car. Must be done on a Sunday.',
  preferredDate: day(-3),
  timeWindow: 'morning',
  address: address('Gidan Kwano, near the university gate', 'town-gidan-kwano', 'Gidan Kwano, Minna', 'Bosso'),
  history: [step('requested', at(-5, 12), 'customer'), step('declined', at(-5, 14), 'vendor', 'I don’t work on Sundays, sorry.')]
}),
job({
  id: '2321',
  ...BALA,
  customerName: 'Peter Adamu',
  serviceName: 'Borehole pump installation',
  description: 'Replace an old submersible pump. The borehole is about 40m deep.',
  preferredDate: day(4),
  timeWindow: 'morning',
  address: address('Barkin Sale, after the police station', 'town-barkin-sale', 'Barkin Sale, Minna', 'Chanchaga'),
  quote: quote(68000, 'Pump removal and installation, new cable and rope, labour. Pump supplied by customer.', 8, at(4, 8), hoursFromNow(22), at(-1, 16)),
  history: [step('requested', at(-2, 13), 'customer'), step('quoted', at(-1, 16), 'vendor')]
}),
...disputedJobs()];

/* ---------- Disputed jobs (Gwani's dispute workspace) ---------- */

interface DisputeSeed {
  id: string;
  vendorId: string;
  vendorName: string;
  customerName: string;
  serviceName: string;
  price: number;
  includes: string;
  description: string;
  place: [landmark: string, placeId: string, placeLabel: string, lga: NigerLga];
  /** When the vendor started the job. */
  startedHoursAgo: number;
  /** Reported while In progress, or after the vendor marked it done. */
  from: 'in_progress' | 'awaiting_confirmation';
  reportedHoursAgo: number;
  reason: JobDispute['reason'];
  details: string;
  photos?: string[];
  /** Already decided by Gwani's team. */
  resolved?: {outcome: NonNullable<JobDispute['resolution']>['outcome'];refundAmount: number;reason: string;hoursAgo: number;};
}

/**
 * Jobs where the customer reported a problem: open ones for the mediators, and a few already resolved.
 * Each has a card or transfer payment held in escrow (payments/mock), so the workspace shows the money too.
 */
function disputedJobs(): Job[] {
  const seeds: DisputeSeed[] = [
  {
    id: '2330', ...BALA, customerName: 'Musa Kabiru', serviceName: 'Borehole pump installation', price: 45000,
    includes: 'Pump fitting, new pipe to the overhead tank, wiring to the existing switch, labour.',
    description: 'Install a 1HP surface pump and connect it to the overhead tank.',
    place: ['Opposite Bosso market, white bungalow', 'town-bosso-estate', 'Bosso Estate, Minna', 'Bosso'],
    startedHoursAgo: 72, from: 'awaiting_confirmation', reportedHoursAgo: 30, reason: 'not_finished',
    details: 'The pump runs but no water reaches the overhead tank. Bala said the pipe was connected but the valve on the roof was never fitted.',
    photos: [IMG.pump, IMG.tank]
  },
  {
    id: '2331', vendorId: 'hauwa-tailoring', vendorName: 'Hauwa Tailoring & Ankara', customerName: 'Ngozi Adeyemi', serviceName: 'Aso-ebi set', price: 32000,
    includes: 'Measuring, sewing two outfits, one fitting.',
    description: 'Two aso-ebi outfits for my sister’s wedding on Saturday. Fabric already bought.',
    place: ['Maitumbi, behind the primary school', 'town-maitumbi', 'Maitumbi, Minna', 'Bosso'],
    startedHoursAgo: 120, from: 'awaiting_confirmation', reportedHoursAgo: 50, reason: 'poor_quality',
    details: 'Both outfits are far too tight even though she measured me at home. The wedding is in three days and I can’t wear either.',
    photos: [IMG.fabric]
  },
  {
    id: '2332', vendorId: 'ibrahim-electrical', vendorName: 'Ibrahim Electrical Works', customerName: 'Halima Yusuf', serviceName: 'Solar & inverter installation', price: 65000,
    includes: 'Mounting four panels, inverter and battery wiring, testing. Labour only.',
    description: 'Install the solar panels and inverter I bought. House in Tunga.',
    place: ['Tunga, opposite the mosque, green gate', 'town-tunga', 'Tunga, Minna', 'Chanchaga'],
    startedHoursAgo: 26, from: 'in_progress', reportedHoursAgo: 8, reason: 'damage',
    details: 'When he connected the inverter there was a bang and my fridge stopped working. He says it was a fault in the fridge.',
    photos: [IMG.electrical]
  },
  {
    id: '2333', vendorId: 'musa-auto-clinic', vendorName: 'Musa Auto Clinic', customerName: DEMO_CUSTOMER.name, serviceName: 'Car AC regas', price: 14000,
    includes: 'Leak test, AC gas top-up, labour.',
    description: 'Car AC is blowing warm air. Toyota Corolla 2010.',
    place: ['Behind NEPA office, blue gate', 'town-tunga', 'Tunga, Minna', 'Chanchaga'],
    startedHoursAgo: 96, from: 'awaiting_confirmation', reportedHoursAgo: 20, reason: 'poor_quality',
    details: 'The AC was cold for two days and now it blows warm again. I think the leak was never fixed.'
  },
  {
    id: '2334', vendorId: 'danladi-carpentry', vendorName: 'Danladi Carpentry & Furniture', customerName: 'Chinedu Okafor', serviceName: 'Door fitting', price: 18000,
    includes: 'Fitting one interior door with frame, hinges and lock. Door supplied by customer.',
    description: 'Fit a new bedroom door. I have bought the door already.',
    place: ['Chanchaga, after the filling station', 'town-chanchaga', 'Chanchaga, Minna', 'Chanchaga'],
    startedHoursAgo: 96, from: 'in_progress', reportedHoursAgo: 70, reason: 'price_changed',
    details: 'Halfway through he asked for ₦8,000 more for hinges and a lock, which were in the quote. He left the door hanging until I pay.'
  },
  {
    id: '2335', vendorId: 'grace-hair-beauty', vendorName: 'Grace Hair & Beauty', customerName: 'Blessing Okon', serviceName: 'Knotless braids', price: 22000,
    includes: 'Medium knotless braids, waist length. Hair extensions included.',
    description: 'Medium knotless braids for an event on Friday.',
    place: ['Bosso Estate, Road 3, house 12', 'town-bosso-estate', 'Bosso Estate, Minna', 'Bosso'],
    startedHoursAgo: 144, from: 'awaiting_confirmation', reportedHoursAgo: 96, reason: 'poor_quality',
    details: 'The braids started loosening after two days and my scalp is sore where they were pulled too tight.',
    photos: [IMG.fabric]
  },
  {
    id: '2336', vendorId: 'emeka-paints', vendorName: 'Emeka Paints & Finishes', customerName: 'Yusuf Danjuma', serviceName: 'Room painting', price: 30000,
    includes: 'Two coats of emulsion on walls and ceiling, filler, labour. Customer buys paint.',
    description: 'Paint the sitting room and one bedroom.',
    place: ['Kpakungu, near the motor park', 'town-kpakungu', 'Kpakungu, Minna', 'Chanchaga'],
    startedHoursAgo: 96, from: 'awaiting_confirmation', reportedHoursAgo: 40, reason: 'not_finished',
    details: 'Only one coat was done in the bedroom and the ceiling was not painted at all, but he marked the job as finished.',
    photos: [IMG.tools]
  },
  {
    id: '2337', vendorId: 'yusuf-borehole', vendorName: 'Yusuf Plumbing & Borehole', customerName: 'Ibrahim Sule', serviceName: 'Borehole pump repair', price: 28000,
    includes: 'Pull out the pump, replace the capacitor and seals, reinstall and test.',
    description: 'Borehole pump hums but no water comes out.',
    place: ['Sabon Gari, behind the bus stop', 'town-sabon-gari', 'Sabon Gari, Minna', 'Chanchaga'],
    startedHoursAgo: 48, from: 'in_progress', reportedHoursAgo: 12, reason: 'not_finished',
    details: 'He pulled the pump out two days ago and hasn’t come back. We have had no water since.',
    photos: [IMG.pump]
  },
  {
    id: '2338', vendorId: 'paiko-cool-electrical', vendorName: 'Paiko Cool Electrical', customerName: 'Fatima Bello', serviceName: 'Split AC installation', price: 30000,
    includes: 'Mounting indoor and outdoor units, piping, drain, testing.',
    description: 'Install a 1.5HP split AC in the bedroom.',
    place: ['Paikoro road, yellow house after the school', 'town-paikoro', 'Paikoro', 'Paikoro'],
    startedHoursAgo: 120, from: 'awaiting_confirmation', reportedHoursAgo: 60, reason: 'damage',
    details: 'While drilling for the pipe they cut through a water pipe in the wall. The wall is wet and the paint is peeling.',
    photos: [IMG.electrical, IMG.tap]
  },
  {
    id: '2339', vendorId: 'suleja-power-electrical', vendorName: 'Suleja Power Electricals', customerName: 'Usman Bello', serviceName: 'Fault tracing', price: 9000,
    includes: 'Fault tracing on the kitchen circuit, replacement breaker, labour.',
    description: 'The kitchen sockets keep tripping the breaker.',
    place: ['Suleja, opposite the central mosque', 'town-suleja', 'Suleja', 'Suleja'],
    startedHoursAgo: 144, from: 'in_progress', reportedHoursAgo: 110, reason: 'other',
    details: 'He started, said he needed a part, and has not answered calls since. The kitchen still has no power.'
  },
  {
    id: '2340', vendorId: 'abdullahi-mechanic', vendorName: 'Abdullahi Mechanic Works', customerName: 'Kabiru Jibril', serviceName: 'Engine diagnosis', price: 7500,
    includes: 'Computer diagnosis and a written report.',
    description: 'Engine light is on and the car shakes when idle.',
    place: ['Kontagora road, by the workshop cluster', 'town-kontagora', 'Kontagora', 'Kontagora'],
    startedHoursAgo: 300, from: 'awaiting_confirmation', reportedHoursAgo: 270, reason: 'poor_quality',
    details: 'He only plugged in the scanner and told me to buy coils. I wanted a proper report.',
    resolved: { outcome: 'release', refundAmount: 0, reason: 'The quote covered a scan and a written report. The vendor sent the report on the day, so the work was done as agreed.', hoursAgo: 220 }
  },
  {
    id: '2341', vendorId: 'bida-royal-tailors', vendorName: 'Bida Royal Tailors', customerName: 'Amina Rufai', serviceName: 'Kaftan', price: 25000,
    includes: 'Kaftan with embroidery on the chest, one fitting.',
    description: 'One embroidered kaftan for my husband.',
    place: ['Bida, near the emir’s palace', 'town-bida', 'Bida', 'Bida'],
    startedHoursAgo: 340, from: 'awaiting_confirmation', reportedHoursAgo: 300, reason: 'not_finished',
    details: 'The embroidery on the chest was not done. Only the kaftan was delivered.',
    resolved: { outcome: 'split', refundAmount: 10000, reason: 'The kaftan was made but the embroidery, priced at about ₦10,000, wasn’t. Refunding that part.', hoursAgo: 250 }
  },
  {
    id: '2342', vendorId: 'sadiya-stitches', vendorName: 'Sadiya Stitches', customerName: 'Esther Peters', serviceName: 'Simple Ankara style', price: 12000,
    includes: 'One simple Ankara gown, one fitting.',
    description: 'Sew a simple gown from my Ankara fabric.',
    place: ['Bosso, Road 5, after the pharmacy', 'town-bosso-estate', 'Bosso Estate, Minna', 'Bosso'],
    startedHoursAgo: 360, from: 'awaiting_confirmation', reportedHoursAgo: 330, reason: 'damage',
    details: 'The fabric was cut wrongly and there is not enough left to fix it. My fabric is ruined.',
    resolved: { outcome: 'refund', refundAmount: 12000, reason: 'The vendor agreed the fabric was cut wrongly. Full refund to the customer.', hoursAgo: 280 }
  }];


  return seeds.map((s) => {
    const started = hoursFromNow(-s.startedHoursAgo);
    const reportedAt = hoursFromNow(-s.reportedHoursAgo);
    const history = [
    step('requested', hoursFromNow(-s.startedHoursAgo - 72), 'customer'),
    step('quoted', hoursFromNow(-s.startedHoursAgo - 60), 'vendor'),
    step('scheduled', hoursFromNow(-s.startedHoursAgo - 48), 'customer'),
    step('in_progress', started, 'vendor'),
    ...(s.from === 'awaiting_confirmation' ? [step('awaiting_confirmation', hoursFromNow(-s.startedHoursAgo + 4), 'vendor')] : []),
    step('disputed', reportedAt, 'customer', s.details)];

    const resolution = s.resolved ?
    { outcome: s.resolved.outcome, refundAmount: s.resolved.refundAmount, at: hoursFromNow(-s.resolved.hoursAgo), reason: s.resolved.reason } :
    null;
    if (resolution) history.push(step(resolution.outcome === 'refund' ? 'cancelled' : 'completed', resolution.at, 'system', resolution.reason));
    return job({
      id: s.id,
      vendorId: s.vendorId,
      vendorName: s.vendorName,
      customerName: s.customerName,
      serviceName: s.serviceName,
      description: s.description,
      photos: s.photos,
      preferredDate: started.slice(0, 10),
      timeWindow: 'morning',
      address: address(...s.place),
      quote: quote(s.price, s.includes, 4, started, hoursFromNow(-s.startedHoursAgo - 50), hoursFromNow(-s.startedHoursAgo - 60)),
      booked: true,
      arrival: { at: started, locationLabel: `near ${s.place[2]}`, coordinates: null },
      dispute: { reason: s.reason, details: s.details, at: reportedAt, resolution },
      history
    });
  });
}
