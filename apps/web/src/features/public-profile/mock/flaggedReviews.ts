import type { PublicReview } from '../types';

/*
 * MOCK: recent customer reviews that went live but were flagged automatically (keyword list) for the
 * moderation queue. They show on the vendor's profile until a moderator removes them. Times are relative.
 */
const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export type FlaggedReview = PublicReview & {vendorId: string;};

export const mockFlaggedReviews: FlaggedReview[] = [
{ id: 'flag-r1', vendorId: 'bala-plumbing', reviewerName: 'Tunde F.', rating: 1, comment: 'Total scam. Don’t pay this man upfront, he is a thief.', serviceName: 'Pipe fitting & repair', createdAt: ago(5), reply: null },
{ id: 'flag-r2', vendorId: 'musa-auto-clinic', reviewerName: 'Kabiru J.', rating: 5, comment: 'Best mechanic in Minna! WhatsApp me on 0803 000 1122 for a discount code.', serviceName: null, createdAt: ago(9), reply: null },
{ id: 'flag-r3', vendorId: 'hauwa-tailoring', reviewerName: 'Esther P.', rating: 2, comment: 'She is useless and stupid, ruined my aso-ebi.', serviceName: 'Aso-ebi set', createdAt: ago(14), reply: null },
{ id: 'flag-r4', vendorId: 'grace-hair-beauty', reviewerName: 'Safiya Z.', rating: 5, comment: 'Lovely braids. Visit www.cheap-hair-deals.ng for the same style at half price.', serviceName: null, createdAt: ago(20), reply: null },
{ id: 'flag-r5', vendorId: 'emeka-paints', reviewerName: 'Usman W.', rating: 1, comment: 'Fraud. Collected money and disappeared for two weeks.', serviceName: null, createdAt: ago(26), reply: null },
{ id: 'flag-r6', vendorId: 'ibrahim-electrical', reviewerName: 'Rukayya H.', rating: 5, comment: 'Great job. Call my cousin on 0812 345 6789 for generator repairs too.', serviceName: 'Fault tracing & repair', createdAt: ago(31), reply: null },
{ id: 'flag-r7', vendorId: 'danladi-carpentry', reviewerName: 'Daniel M.', rating: 1, comment: 'Idiot carpenter. The wardrobe door fell off in a week.', serviceName: null, createdAt: ago(38), reply: null },
{ id: 'flag-r8', vendorId: 'zainab-dispatch', reviewerName: 'Victor C.', rating: 4, comment: 'Quick delivery. Pay me directly next time and avoid Gwani fees.', serviceName: 'Same-day parcel delivery', createdAt: ago(44), reply: null },
{ id: 'flag-r9', vendorId: 'swift-wheels', reviewerName: 'Hadiza B.', rating: 1, comment: 'Scam rider, the package never arrived and he blocked my number.', serviceName: null, createdAt: ago(52), reply: null },
{ id: 'flag-r10', vendorId: 'yusuf-borehole', reviewerName: 'Joseph E.', rating: 5, comment: 'Excellent pump installation. Contact 0705 111 2233 for cheaper parts.', serviceName: null, createdAt: ago(60), reply: null },
{ id: 'flag-r11', vendorId: 'sadiya-stitches', reviewerName: 'Amina R.', rating: 3, comment: 'Average work. Honestly the owner is a fool with customers.', serviceName: null, createdAt: ago(70), reply: null },
{ id: 'flag-r12', vendorId: 'abdullahi-mechanic', reviewerName: 'Maryam L.', rating: 5, comment: 'Very good. Ask for him on WhatsApp so you don’t pay through the app.', serviceName: null, createdAt: ago(80), reply: null },
{ id: 'flag-r13', vendorId: 'chidi-carpentry', reviewerName: 'Blessing O.', rating: 1, comment: 'This guy is a thief, he took the extra wood home.', serviceName: null, createdAt: ago(90), reply: null },
{ id: 'flag-r14', vendorId: 'bida-royal-tailors', reviewerName: 'Abdullahi U.', rating: 5, comment: 'Superb kaftan. Best tailor in Bida, five stars. Five stars. Five stars.', serviceName: null, createdAt: ago(100), reply: null },
{ id: 'flag-r15', vendorId: 'paiko-cool-electrical', reviewerName: 'Zainab A.', rating: 2, comment: 'Fake parts used. Scam electrician, avoid.', serviceName: null, createdAt: ago(110), reply: null },
{ id: 'flag-r16', vendorId: 'suleja-power-electrical', reviewerName: 'Tunde F.', rating: 5, comment: 'Great inverter setup. My number is 0901 222 3344 if you need the same.', serviceName: null, createdAt: ago(120), reply: null }];
