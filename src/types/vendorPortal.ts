export type RequestStatus = 'awaiting_quote' | 'quoted' | 'declined';

export interface VendorRequest {
  id: string;
  customerName: string;
  description: string;
  area: string;
  minutesAgo: number;
  status: RequestStatus;
  quote: number | null;
  note: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  duration: string;
  description?: string;
  photo: string | null;
}

export type NewServiceInput = Omit<ServiceItem, 'id' | 'photo'>;

export type AppointmentStatus = 'confirmed' | 'in_progress' | 'completed';

export interface Appointment {
  id: string;
  customerName: string;
  service: string;
  area: string;
  start: string;
  durationHours: number;
  status: AppointmentStatus;
}

export interface AppointmentStatusInfo {
  label: string;
  badgeClass: string;
  blockClass: string;
}

export interface EarningTransaction {
  id: string;
  customerName: string;
  service: string;
  date: string;
  amount: number;
}

export interface WeeklyEarning {
  label: string;
  total: number;
}

export interface VendorAccount {
  vendorId: string;
  businessName: string;
  tier: string;
  subscriptionPrice: number;
  renewsOn: string;
  payoutAccount: string;
  availableBalance: number;
  nextPayout: string;
  profileCompletion: number;
  profileHint: string;
  rating: number;
  jobsCompleted: number;
  slaMinutes: number;
  feeRate: number;
  workingHours: string;
}