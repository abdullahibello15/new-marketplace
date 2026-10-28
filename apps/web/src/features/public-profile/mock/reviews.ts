import type { StarLevel } from '../../vendor-dashboard/types';
import type { Vendor } from '../../../types/marketplace';
import type { PublicReview } from '../types';

/*
 * Mock customer reviews, generated per vendor so every vendor has believable reviews without
 * hand-writing hundreds. Generation is seeded by the vendor id, so the same vendor always gets the same
 * reviews, and the count and average match the vendor's `reviews` and `rating` shown on cards.
 */

const REVIEWERS = [
'Aisha M.', 'Musa K.', 'Ngozi A.', 'Ibrahim S.', 'Halima Y.', 'Chinedu O.', 'Fatima B.', 'Emeka N.', 'Zainab A.', 'Yusuf D.',
'Grace I.', 'Salisu T.', 'Blessing O.', 'Abdullahi U.', 'Hauwa G.', 'Peter A.', 'Maryam L.', 'Tunde F.', 'Amina R.', 'Joseph E.',
'Hadiza B.', 'Kabiru J.', 'Esther P.', 'Usman W.', 'Rukayya H.', 'Daniel M.', 'Safiya Z.', 'Victor C.'];


const COMMENTS: Record<StarLevel, string[]> = {
  5: [
  'Excellent work on the {service}. Came on time and cleaned up after.',
  'Very professional. The price was exactly what was quoted.',
  'Fast and careful. I will call again and I’ve already told my neighbours.',
  'Did a neat job on the {service}. Explained everything before starting.',
  'Honest and reliable. Fixed the problem on the first visit.',
  'Great service from start to finish. Highly recommended in Minna.'],

  4: [
  'Good job on the {service}. Came about 30 minutes late but called ahead.',
  'Solid work and fair price. Had to come back once to finish up.',
  'Happy with the result. Communication could be a little better.',
  'Did the {service} well. Slightly more than the first quote because of parts.'],

  3: [
  'The {service} is done but it took longer than promised.',
  'Okay work. Had to remind them twice about the time.',
  'Average experience. The result is fine but the area was left untidy.'],

  2: [
  'Came very late and didn’t call. The {service} needed a second visit.',
  'Price went up after the job started. Not happy with that.'],

  1: [
  'Didn’t turn up on the agreed day and stopped answering calls.',
  'Poor work on the {service}. Had to hire someone else to redo it.']

};

const REPLIES = {
  positive: ['Thank you so much! Always happy to help.', 'Thanks for the kind words. See you next time!', 'We appreciate you. Thanks for choosing us.'],
  negative: [
  'Sorry about this. Please call me so I can make it right at no extra cost.',
  'I apologise for the delay. We’ve changed how we schedule so it doesn’t happen again.',
  'Thank you for the feedback. I’ve sent you a message to sort this out.']

};

const REVIEW_SPAN_DAYS = 540;
const DAY_MS = 86_400_000;

/** Small deterministic random generator (LCG) seeded from a string. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h, 1664525) + 1013904223 >>> 0;
    return h / 2 ** 32;
  };
}

const pick = <T,>(list: T[], rnd: () => number): T => list[Math.floor(rnd() * list.length)];

/**
 * Ratings whose sum is round(rating × count), so the average rounds back to the vendor's rating.
 * Starts from all 5s and takes one star at a time off random reviews.
 */
function ratingsFor(count: number, average: number, rnd: () => number): StarLevel[] {
  const ratings: number[] = Array(count).fill(5);
  let toRemove = 5 * count - Math.round(average * count);
  while (toRemove > 0) {
    const i = Math.floor(rnd() * count);
    if (ratings[i] > 1) {
      ratings[i] -= 1;
      toRemove -= 1;
    }
  }
  return ratings as StarLevel[];
}

const cache = new Map<string, PublicReview[]>();

export function mockReviewsFor(vendor: Vendor, now = Date.now()): PublicReview[] {
  const key = `${vendor.id}:${vendor.reviews}:${vendor.rating}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const rnd = seededRandom(vendor.id);
  const services = vendor.services.map((s) => s.name);
  const reviews = ratingsFor(vendor.reviews, vendor.rating, rnd).map((rating, i): PublicReview => {
    const daysAgo = Math.floor((i + rnd()) * REVIEW_SPAN_DAYS / Math.max(vendor.reviews, 1));
    const createdAt = new Date(now - daysAgo * DAY_MS - Math.floor(rnd() * DAY_MS));
    const serviceName = services.length ? pick(services, rnd) : null;
    const comment = rnd() < 0.1 ? '' : pick(COMMENTS[rating], rnd).replace('{service}', serviceName?.toLowerCase() ?? 'job');
    const replyChance = rating <= 3 ? 0.7 : 0.25;
    const reply =
    rnd() < replyChance ?
    { body: pick(rating <= 3 ? REPLIES.negative : REPLIES.positive, rnd), createdAt: new Date(createdAt.getTime() + DAY_MS).toISOString() } :
    null;
    return { id: `${vendor.id}-r${i + 1}`, reviewerName: pick(REVIEWERS, rnd), rating, comment, serviceName, createdAt: createdAt.toISOString(), reply };
  });

  cache.set(key, reviews);
  return reviews;
}
