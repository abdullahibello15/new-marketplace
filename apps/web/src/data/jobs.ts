import type { Job } from '../types/marketplace';

function at(daysFromNow: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const jobs: Job[] = [
{
  id: '2291',
  vendorId: 'bala-plumbing',
  description: 'Kitchen tap leaking, needs replacement washer or new tap.',
  photos: ["/a9d11f11-7784-4fed-80c6-44c46b6c48d4.jpg"],
  scheduledAt: at(1, 10),
  address: 'Tunga, behind NEPA office',
  stage: 'accepted',
  quote: 6500,
  createdAt: at(0, 8)
},
{
  id: '2284',
  vendorId: 'hauwa-tailoring',
  description: 'Two aso-ebi outfits for a wedding, Ankara fabric already bought.',
  photos: [],
  scheduledAt: at(-5, 14),
  address: 'Tunga, behind NEPA office',
  stage: 'completed',
  quote: 18000,
  createdAt: at(-12, 9)
}];