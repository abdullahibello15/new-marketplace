import type { GeoPoint, NigerLga } from '../../types/marketplace';
import type { StarLevel } from '../vendor-dashboard/types';
import type { DISPUTE_REASON, JOB_ACTOR, JOB_STATUS, RESCHEDULE_STATUS, TIME_WINDOW } from './constants';

type ValueOf<T> = T[keyof T];

export type JobStatus = ValueOf<typeof JOB_STATUS>;
/** Who made a change: the customer, the vendor, or the platform itself (e.g. auto-closing). */
export type JobActor = ValueOf<typeof JOB_ACTOR>;
export type TimeWindow = ValueOf<typeof TIME_WINDOW>;
export type RescheduleStatus = ValueOf<typeof RESCHEDULE_STATUS>;
export type DisputeReason = ValueOf<typeof DISPUTE_REASON>;
/** The two people on a job. The platform ("system") never requests or answers a reschedule. */
export type JobParty = Exclude<JobActor, 'system'>;

/** One entry in a job's audit trail. */
export interface JobStatusChange {
  status: JobStatus;
  /** ISO timestamp. */
  at: string;
  by: JobActor;
  /** Optional context, e.g. a decline or rejection reason. */
  note?: string;
}

/** Landmark-style address: Minna addresses are usually "behind NEPA office", not a street and postcode. */
export interface JobAddress {
  /** Street, house number or landmark, as the customer wrote it. */
  landmark: string;
  /** Town or LGA picked from the list (a discovery Place id). */
  placeId: string;
  /** e.g. "Tunga, Minna" */
  placeLabel: string;
  lga: NigerLga;
  /** Set when the customer used "Use my current location". */
  coordinates: GeoPoint | null;
}

export interface JobQuote {
  /** Whole Naira. */
  amount: number;
  includes: string;
  durationHours: number;
  /** ISO date-time the vendor proposes to start. */
  proposedStart: string;
  /** ISO date-time after which the customer can no longer accept. */
  expiresAt: string;
  sentAt: string;
}

export interface Job {
  id: string;
  vendorId: string;
  /** Denormalised so lists don't need a vendor lookup. */
  vendorName: string;
  customerId: string;
  customerName: string;
  /** The vendor service the customer picked, if any. */
  serviceName: string | null;
  description: string;
  photos: string[];
  /** "yyyy-MM-dd" */
  preferredDate: string;
  timeWindow: TimeWindow;
  address: JobAddress;
  status: JobStatus;
  /** Oldest first. Never edited, only appended to. */
  history: JobStatusChange[];
  quote: JobQuote | null;
  /** Locked in when the customer accepts the quote. */
  scheduledAt: string | null;
  agreedPrice: number | null;
  /** Recorded when the vendor taps "I've arrived / Start job". */
  arrival: JobArrival | null;
  /** Every reschedule request, oldest first, whatever the outcome. */
  reschedules: RescheduleRequest[];
  /** Set when the customer reports a problem instead of confirming. */
  dispute: JobDispute | null;
  /** The customer's rating and review, left after confirming. */
  review: JobReview | null;
  createdAt: string;
  updatedAt: string;
}

export type JobStatusFilter = 'all' | JobStatus;

export interface NewJobRequest {
  vendorId: string;
  serviceName: string | null;
  description: string;
  photos: string[];
  preferredDate: string;
  timeWindow: TimeWindow;
  address: JobAddress;
}

export interface JobArrival {
  at: string;
  /** e.g. "near Tunga, Minna"; null when the vendor chose not to share their location. */
  locationLabel: string | null;
  coordinates: GeoPoint | null;
}

export interface RescheduleRequest {
  id: string;
  requestedBy: JobParty;
  /** The booked start when the request was made. */
  fromStart: string;
  proposedStart: string;
  reason: string;
  status: RescheduleStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface JobDispute {
  reason: DisputeReason;
  details: string;
  at: string;
}

export interface JobReview {
  rating: StarLevel;
  comment: string;
  at: string;
}

/** A mock in-app notification about one change to a job. */
export interface JobNotification {
  id: string;
  recipient: JobParty;
  /** Customer id or vendor id. */
  recipientId: string;
  jobId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface QuoteInput {
  amount: number;
  includes: string;
  durationHours: number;
  proposedStart: string;
  expiresInHours: number;
}
