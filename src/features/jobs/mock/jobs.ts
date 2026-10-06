import { addDays, format } from 'date-fns';
import { user } from '../../../data/user';
import { CURRENT_CUSTOMER_ID } from '../constants';
import type { NigerLga } from '../../../types/marketplace';
import type {
  Job,
  JobActor,
  JobAddress,
  JobArrival,
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
  /** Copy the quote's start and price as the agreed booking. */
  booked?: boolean;
}

function job(seed: Seed): Job {
  const last = seed.history[seed.history.length - 1];
  const isAisha = seed.customerName === user.fullName;
  return {
    id: seed.id,
    vendorId: seed.vendorId,
    vendorName: seed.vendorName,
    customerId: isAisha ? CURRENT_CUSTOMER_ID : `cust-${seed.customerName.toLowerCase().replace(/[^a-z]+/g, '-')}`,
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
    cancellation: null,
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
  customerName: user.fullName,
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
  customerName: user.fullName,
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
job({
  id: '2302',
  vendorId: 'ibrahim-electrical',
  vendorName: 'Ibrahim Electrical Works',
  customerName: user.fullName,
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
  customerName: user.fullName,
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
  customerName: user.fullName,
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
  customerName: user.fullName,
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
  customerName: user.fullName,
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
  customerName: user.fullName,
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
})];
