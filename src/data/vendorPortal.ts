import { addMonths, format, nextFriday, startOfMonth, subWeeks } from 'date-fns';
import type {
  Appointment,
  AppointmentStatus,
  AppointmentStatusInfo,
  EarningTransaction,
  VendorAccount,
  VendorRequest,
  WeeklyEarning } from
'../types/vendorPortal';

function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const vendorAccount: VendorAccount = {
  vendorId: 'bala-plumbing',
  businessName: 'Bala Plumbing',
  tier: 'Trade tier',
  subscriptionPrice: 2500,
  renewsOn: startOfMonth(addMonths(new Date(), 1)).toISOString(),
  payoutAccount: 'GTBank ••4521',
  availableBalance: 32700,
  nextPayout: nextFriday(new Date()).toISOString(),
  profileCompletion: 70,
  profileHint: 'Add work photos to your services to reach 100%.',
  rating: 4.8,
  jobsCompleted: 62,
  slaMinutes: 15,
  feeRate: 0.05,
  workingHours: 'Mon–Sat, 8am–6pm'
};

export const vendorRequests: VendorRequest[] = [
{
  id: 'r1',
  customerName: 'Aisha M.',
  description: 'Kitchen tap leak',
  area: 'Tunga',
  minutesAgo: 8,
  status: 'awaiting_quote',
  quote: null,
  note: ''
},
{
  id: 'r2',
  customerName: 'Musa K.',
  description: 'Borehole pump not pumping',
  area: 'Bosso',
  minutesAgo: 22,
  status: 'awaiting_quote',
  quote: null,
  note: ''
},
{
  id: 'r3',
  customerName: 'Ngozi A.',
  description: '2,000L water tank installation',
  area: 'Maitumbi',
  minutesAgo: 95,
  status: 'quoted',
  quote: 35000,
  note: 'Includes stand fitting and connection to main line.'
}];


export const serviceDurations = ['~1 hr', '~1–2 hrs', '~half day', '~1 day', '2+ days'];

export const appointments: Appointment[] = [
{ id: 'a1', customerName: 'Salisu T.', service: 'Toilet cistern repair', area: 'Kpakungu', start: at(-2, 11), durationHours: 2, status: 'completed' },
{ id: 'a2', customerName: 'Emeka N.', service: 'Drain unblocking', area: 'Chanchaga', start: at(0, 9), durationHours: 1, status: 'completed' },
{ id: 'a3', customerName: 'Ibrahim S.', service: 'Pipe fitting & repair', area: 'Bosso', start: at(0, 14), durationHours: 2, status: 'in_progress' },
{ id: 'a4', customerName: 'Aisha M.', service: 'Kitchen tap replacement', area: 'Tunga', start: at(1, 10), durationHours: 1.5, status: 'confirmed' },
{ id: 'a5', customerName: 'Musa K.', service: 'Borehole pump installation', area: 'Bosso', start: at(2, 9), durationHours: 7, status: 'confirmed' },
{ id: 'a6', customerName: 'Ngozi A.', service: 'Water tank installation', area: 'Maitumbi', start: at(3, 13), durationHours: 4, status: 'confirmed' }];


export const appointmentStatuses: Record<AppointmentStatus, AppointmentStatusInfo> = {
  confirmed: { label: 'Confirmed', badgeClass: 'bg-[#E3EEEC] text-pine', blockClass: 'bg-pine text-white' },
  in_progress: { label: 'In progress', badgeClass: 'bg-[#F7EBCB] text-mustard-dark', blockClass: 'bg-mustard text-ink' },
  completed: { label: 'Completed', badgeClass: 'bg-sand text-muted', blockClass: 'border border-line bg-sand text-muted' }
};

export const earningTransactions: EarningTransaction[] = [
{ id: 'e1', customerName: 'Emeka N.', service: 'Drain unblocking', date: at(0, 10), amount: 5500 },
{ id: 'e2', customerName: 'Chinedu O.', service: 'Shower mixer install', date: at(-1, 16), amount: 15000 },
{ id: 'e3', customerName: 'Fatima B.', service: 'Leak inspection & fix', date: at(-3, 12), amount: 9200 },
{ id: 'e4', customerName: 'Yusuf D.', service: 'Toilet cistern repair', date: at(-5, 15), amount: 12000 },
{ id: 'e5', customerName: 'Halima Y.', service: 'Tap replacement', date: at(-6, 11), amount: 6500 },
{ id: 'e6', customerName: 'Salisu T.', service: 'Pipe fitting & repair', date: at(-8, 13), amount: 7800 },
{ id: 'e7', customerName: 'Grace I.', service: 'Water tank installation', date: at(-10, 9), amount: 33100 }];


export const weeklyEarnings: WeeklyEarning[] = [31500, 38000, 27400, 44100, 36800, 52300, 40900, 48200].map(
  (total, i) => ({ label: format(subWeeks(new Date(), 7 - i), 'd MMM'), total })
);