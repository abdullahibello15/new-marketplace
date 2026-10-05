import { daysFromNow } from './time';
import type { Review } from '../types';

export const mockReviews: Review[] = [
{
  id: 'rv1',
  customerName: 'Grace Ibrahim',
  item: 'Water tank installation',
  rating: 5,
  comment: 'Bala and his boy came early, finished the same day and cleaned up after. Water pressure is much better now.',
  createdAt: daysFromNow(-5, 18),
  reply: null,
  report: null
},
{
  id: 'rv2',
  customerName: 'Salisu Tanko',
  item: 'Toilet cistern repair',
  rating: 4,
  comment: 'Fixed the problem quickly. He had to go and buy a part, so it took a bit longer than he said.',
  createdAt: daysFromNow(-2, 16),
  reply: null,
  report: null
},
{
  id: 'rv3',
  customerName: 'Halima Yusuf',
  item: 'Tap replacement',
  rating: 5,
  comment: 'Very polite and the price was fair. Will call him again.',
  createdAt: daysFromNow(-7, 12),
  reply: { body: 'Thank you Halima! Always happy to help.', createdAt: daysFromNow(-6, 9) },
  report: null
},
{
  id: 'rv4',
  customerName: 'Peter Adamu',
  item: 'Drain unblocking',
  rating: 2,
  comment: 'Came two hours late and did not call to say. The drain is working now but I had to wait all morning.',
  createdAt: daysFromNow(-12, 14),
  reply: null,
  report: null
},
{
  id: 'rv5',
  customerName: 'Chinedu Okeke',
  item: 'Shower mixer install',
  rating: 5,
  comment: 'Neat work. The shower has never worked this well.',
  createdAt: daysFromNow(-3, 20),
  reply: null,
  report: null
},
{
  id: 'rv6',
  customerName: 'Anonymous',
  item: 'Pipe fitting & repair',
  rating: 1,
  comment: 'Buy cheap generator parts at www.example-deals.ng, call 0800 000 0000!!!',
  createdAt: daysFromNow(-9, 3),
  reply: null,
  report: { reason: 'spam', details: '', reportedAt: daysFromNow(-9, 8) }
},
{
  id: 'rv7',
  customerName: 'Fatima Bello',
  item: 'Leak inspection & fix',
  rating: 4,
  comment: 'Found the leak behind the wall without breaking too many tiles. Good job.',
  createdAt: daysFromNow(-15, 11),
  reply: { body: 'Thanks Fatima. Remember to check the joint again after the rains.', createdAt: daysFromNow(-14, 10) },
  report: null
},
{
  id: 'rv8',
  customerName: 'Musa Kabiru',
  item: 'Borehole pump service',
  rating: 3,
  comment: 'Pump works but it is noisier than before. He said he will come back to check.',
  createdAt: daysFromNow(-20, 17),
  reply: null,
  report: null
},
{
  id: 'rv9',
  customerName: 'Ngozi Adeyemi',
  item: 'Pipe fitting & repair',
  rating: 5,
  comment: 'Fast response on a Sunday emergency. Lifesaver.',
  createdAt: daysFromNow(-26, 19),
  reply: null,
  report: null
},
{
  id: 'rv10',
  customerName: 'Emeka Nwosu',
  item: 'Drain unblocking',
  rating: 4,
  comment: '',
  createdAt: daysFromNow(-1, 13),
  reply: null,
  report: null
}];
