import { findTradeCategory } from '../../../data/tradeCategories';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors, incrementVendorCancellations } from '../../../services/vendorStore';
import { withListingRestrictions } from '../../vendor-dashboard/services/subscriptionService';
import { user } from '../../../data/user';
import { CURRENT_CUSTOMER_ID, DISPUTE_OUTCOME, DISPUTE_OUTCOME_LABELS, JOB_ACTOR, JOB_STATUS, RESCHEDULE_CUTOFF_HOURS, RESCHEDULE_STATUS } from '../constants';
import { CANCELLATION_POLICY, getCancellationTerms } from '../cancellationPolicy';
import { mockJobs } from '../mock/jobs';
import { pendingReschedule, rescheduleBlockedReason, rescheduleResponseBlockedReason } from '../reschedule';
import { JobTransitionError, applyTransition, transitionBlockedReason } from '../stateMachine';
import { recordJobEvent } from './notificationService';
import { onJobRescheduled, onJobStatusChanged, onJobsLoaded } from '../../reminders/jobReminderEvents';
import { deliverDueReminders } from '../../reminders/services/reminderService';
import { applyJobEscrowChange } from '../../payments/services/escrowService';
import type { JobEvent } from '../utils/notificationCopy';
import type { StarLevel } from '../../vendor-dashboard/types';
import type { DisputeOutcome, DisputeReason, Job, JobActor, JobParty, JobStatus, NewJobRequest, QuoteInput } from '../types';

/*
 * The one job store for the whole app: the customer's My Jobs and the vendor's requests both read and
 * write here, so a request sent by a customer is the same record the vendor quotes on.
 * Every status change goes through the state machine (applyTransition); nothing sets `status` directly.
 */
let jobs: Job[] = structuredClone(mockJobs);
let nextId = Math.max(...jobs.map((j) => Number(j.id))) + 1;

// Seed notifications from each job's most recent change (older than 3 days counts as already read).
const SEED_UNREAD_WITHIN_MS = 3 * 86_400_000;
for (const job of jobs) {
  const last = job.history[job.history.length - 1];
  recordJobEvent(job, { type: 'status', change: last }, last.at, Date.now() - new Date(last.at).getTime() > SEED_UNREAD_WITHIN_MS);
  const pending = pendingReschedule(job);
  if (pending) recordJobEvent(job, { type: 'reschedule_requested', request: pending }, pending.createdAt);
}
// Booking reminders for jobs that are already scheduled.
onJobsLoaded(jobs);

const newestFirst = (a: Job, b: Job) => b.updatedAt.localeCompare(a.updatedAt);

function findJob(id: string): Job {
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new ApiError('We couldn’t find that job.', 404);
  return job;
}

function save(updated: Job, event?: JobEvent, at?: string): Job {
  jobs = jobs.map((j) => j.id === updated.id ? updated : j);
  if (event) recordJobEvent(updated, event, at);
  return updated;
}

/** Runs a state-machine transition, saves it and notifies. Blocked moves become a 409 the UI can show. */
function transition(id: string, to: JobStatus, by: JobActor, options: Parameters<typeof applyTransition>[3] = {}): Job {
  let updated: Job;
  const from = findJob(id).status;
  try {
    updated = applyTransition(findJob(id), to, by, options);
  } catch (e) {
    if (e instanceof JobTransitionError) throw new ApiError(e.message, 409);
    throw e;
  }
  const change = updated.history[updated.history.length - 1];
  const saved = save(updated, { type: 'status', change }, change.at);
  // State-machine events → booking reminders, and escrow (release on completion, refund on cancel, hold on dispute).
  onJobStatusChanged(saved, from);
  applyJobEscrowChange(saved, from);
  return saved;
}

/**
 * MOCK of the server's scheduled tasks (a cron job in production). Runs before every read, so the
 * effect is the same as if a timer had fired:
 *  - work not confirmed or disputed within 48 hours is confirmed automatically;
 *  - completed jobs with no review step after 7 days are closed;
 *  - booking reminders whose time has come are delivered (MOCK: see reminderService).
 * The state machine's timing guards decide when each is allowed; this only tries.
 */
export function runScheduledJobTasks(now = new Date()): void {
  deliverDueReminders(now);
  for (const job of jobs) {
    if (job.status === JOB_STATUS.AwaitingConfirmation && !transitionBlockedReason(job, JOB_STATUS.Completed, JOB_ACTOR.System, now)) {
      transition(job.id, JOB_STATUS.Completed, JOB_ACTOR.System, { note: 'Confirmed automatically: no reply within 48 hours', at: now });
    }
  }
  for (const job of jobs) {
    if (job.status === JOB_STATUS.Completed && !transitionBlockedReason(job, JOB_STATUS.Closed, JOB_ACTOR.System, now)) {
      transition(job.id, JOB_STATUS.Closed, JOB_ACTOR.System, { note: 'Closed automatically after the review window', at: now });
    }
  }
}

/* ---------- Reads ---------- */

/** GET /me/jobs — the signed-in customer's jobs, most recently updated first. */
export function listCustomerJobs(): Promise<Job[]> {
  return mockResponse(() => {
    runScheduledJobTasks();
    return jobs.filter((j) => j.customerId === CURRENT_CUSTOMER_ID).sort(newestFirst);
  });
}

/** GET /vendor/jobs — every job sent to this vendor. */
export function listVendorJobs(vendorId: string): Promise<Job[]> {
  return mockResponse(() => {
    runScheduledJobTasks();
    return jobs.filter((j) => j.vendorId === vendorId).sort(newestFirst);
  });
}

/** GET /jobs/:id */
export function getJob(id: string): Promise<Job> {
  return mockResponse(() => {
    runScheduledJobTasks();
    return findJob(id);
  });
}

/** Reviews customers left on this vendor's jobs, for the vendor's public profile. */
export function reviewsForVendor(vendorId: string) {
  return jobs.flatMap((j) =>
  j.vendorId === vendorId && j.review ? [{ jobId: j.id, customerName: j.customerName, serviceName: j.serviceName, ...j.review }] : []
  );
}

/* ---------- Request and quote ---------- */

/** POST /jobs — a customer asks a service vendor for a quote. Starts as Requested. */
export function createJobRequest(input: NewJobRequest): Promise<Job> {
  return mockResponse(() => {
    const found = getAllVendors().find((v) => v.id === input.vendorId);
    const vendor = found && withListingRestrictions(found);
    if (!vendor) throw new ApiError('We couldn’t find that vendor.', 404);
    if (findTradeCategory(vendor.tradeCategory)?.kind === 'retail') throw new ApiError('This vendor takes product requests, not job bookings.', 400);
    if (vendor.unavailable) throw new ApiError(`${vendor.name} isn’t taking new bookings right now.`, 409);

    const now = new Date().toISOString();
    const job: Job = {
      ...input,
      id: String(nextId++),
      vendorName: vendor.name,
      customerId: CURRENT_CUSTOMER_ID,
      customerName: user.fullName,
      status: JOB_STATUS.Requested,
      history: [{ status: JOB_STATUS.Requested, at: now, by: JOB_ACTOR.Customer }],
      quote: null,
      scheduledAt: null,
      agreedPrice: null,
      arrival: null,
      reschedules: [],
      dispute: null,
      review: null,
      cancellation: null,
      createdAt: now,
      updatedAt: now
    };
    jobs = [job, ...jobs];
    recordJobEvent(job, { type: 'status', change: job.history[0] }, now);
    return job;
  }, 900);
}

/** POST /vendor/jobs/:id/quote — Requested → Quoted. */
export function sendQuote(jobId: string, input: QuoteInput): Promise<Job> {
  return mockResponse(() => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.expiresInHours * 3_600_000);
    if (new Date(input.proposedStart) <= now) throw new ApiError('The proposed start time has already passed.', 400);
    if (expiresAt > new Date(input.proposedStart)) throw new ApiError('The quote must expire before the proposed start time.', 400);
    return transition(jobId, JOB_STATUS.Quoted, JOB_ACTOR.Vendor, {
      changes: {
        quote: {
          amount: input.amount,
          includes: input.includes,
          durationHours: input.durationHours,
          proposedStart: input.proposedStart,
          expiresAt: expiresAt.toISOString(),
          sentAt: now.toISOString()
        }
      }
    });
  });
}

/** POST /vendor/jobs/:id/decline — Requested → Declined, with an optional reason for the customer. */
export function declineJob(jobId: string, reason: string): Promise<Job> {
  return mockResponse(() => transition(jobId, JOB_STATUS.Declined, JOB_ACTOR.Vendor, { note: reason || undefined }));
}

/** POST /jobs/:id/accept — Quoted → Scheduled. Locks in the quoted date and price. (Expiry is a state-machine guard.) */
export function acceptQuote(jobId: string): Promise<Job> {
  return mockResponse(() => {
    const quote = findJob(jobId).quote;
    return transition(jobId, JOB_STATUS.Scheduled, JOB_ACTOR.Customer, {
      changes: quote ? { scheduledAt: quote.proposedStart, agreedPrice: quote.amount } : {}
    });
  });
}

/** POST /jobs/:id/reject — Quoted → Quote Rejected, with an optional reason for the vendor. */
export function rejectQuote(jobId: string, reason: string): Promise<Job> {
  return mockResponse(() => transition(jobId, JOB_STATUS.QuoteRejected, JOB_ACTOR.Customer, { note: reason || undefined }));
}

/* ---------- Task 54: on the day ---------- */

/**
 * POST /vendor/jobs/:id/start — Scheduled → In Progress ("I've arrived / Start job").
 * Allowed from 1 hour before the booked time (state-machine guard). MOCK location: the real app would
 * read the phone's GPS with permission; here it records "near <customer's area>" if the vendor agrees.
 */
export function startJob(jobId: string, { shareLocation }: {shareLocation: boolean;}): Promise<Job> {
  return mockResponse(() => {
    const job = findJob(jobId);
    const at = new Date();
    return transition(jobId, JOB_STATUS.InProgress, JOB_ACTOR.Vendor, {
      at,
      changes: {
        arrival: {
          at: at.toISOString(),
          locationLabel: shareLocation ? `near ${job.address.placeLabel}` : null,
          coordinates: shareLocation ? job.address.coordinates : null
        }
      }
    });
  }, 700);
}

/** POST /vendor/jobs/:id/done — In Progress → Awaiting confirmation. Starts the 48-hour auto-confirm clock. */
export function markWorkDone(jobId: string): Promise<Job> {
  return mockResponse(() => transition(jobId, JOB_STATUS.AwaitingConfirmation, JOB_ACTOR.Vendor));
}

/* ---------- Task 55: confirmation, disputes, reviews ---------- */

/** POST /jobs/:id/confirm — Awaiting confirmation → Completed. */
export function confirmCompletion(jobId: string): Promise<Job> {
  return mockResponse(() => transition(jobId, JOB_STATUS.Completed, JOB_ACTOR.Customer));
}

/** POST /jobs/:id/dispute — Awaiting confirmation → Disputed. Flags the job for Gwani's review team. */
export function reportProblem(jobId: string, input: {reason: DisputeReason;details: string;}): Promise<Job> {
  return mockResponse(() =>
  transition(jobId, JOB_STATUS.Disputed, JOB_ACTOR.Customer, {
    note: input.details,
    changes: { dispute: { ...input, at: new Date().toISOString() } }
  })
  );
}

/** POST /jobs/:id/review — Completed → Closed, with the customer's rating and review. */
export function submitReview(jobId: string, input: {rating: StarLevel;comment: string;}): Promise<Job> {
  return mockResponse(() =>
  transition(jobId, JOB_STATUS.Closed, JOB_ACTOR.Customer, {
    note: `Left a ${input.rating}★ review`,
    changes: { review: { ...input, at: new Date().toISOString() } }
  })
  );
}

/** POST /jobs/:id/close — Completed → Closed without a review (the customer skipped the review step). */
export function skipReview(jobId: string): Promise<Job> {
  return mockResponse(() => transition(jobId, JOB_STATUS.Closed, JOB_ACTOR.Customer, { note: 'Closed without a review' }));
}

/* ---------- Task 56: reschedule ---------- */

/** POST /jobs/:id/reschedules — either side proposes a new start. The job stays Scheduled. */
export function requestReschedule(jobId: string, by: JobParty, input: {proposedStart: string;reason: string;}): Promise<Job> {
  return mockResponse(() => {
    const job = findJob(jobId);
    const blocked = rescheduleBlockedReason(job);
    if (blocked) throw new ApiError(blocked, 409);
    const proposed = new Date(input.proposedStart);
    if (proposed.getTime() < Date.now() + RESCHEDULE_CUTOFF_HOURS * 3_600_000) {
      throw new ApiError(`The new time must be at least ${RESCHEDULE_CUTOFF_HOURS} hours from now.`, 400);
    }
    if (job.scheduledAt && proposed.getTime() === new Date(job.scheduledAt).getTime()) throw new ApiError('That’s the time it’s already booked for.', 400);

    const now = new Date().toISOString();
    const request = {
      id: `rs-${job.id}-${job.reschedules.length + 1}`,
      requestedBy: by,
      fromStart: job.scheduledAt ?? now,
      proposedStart: proposed.toISOString(),
      reason: input.reason,
      status: RESCHEDULE_STATUS.Pending,
      createdAt: now,
      respondedAt: null
    };
    return save({ ...job, reschedules: [...job.reschedules, request], updatedAt: now }, { type: 'reschedule_requested', request }, now);
  });
}

/**
 * POST /jobs/:id/reschedules/:requestId — the other side accepts (the booked time moves) or declines
 * (the original time stands). Either way the job stays Scheduled; the vendor's calendar reads scheduledAt.
 */
export function respondToReschedule(jobId: string, requestId: string, by: JobParty, accept: boolean): Promise<Job> {
  return mockResponse(() => {
    const job = findJob(jobId);
    const blocked = rescheduleResponseBlockedReason(job, requestId, by);
    if (blocked) throw new ApiError(blocked, 409);
    const request = job.reschedules.find((r) => r.id === requestId);
    if (!request) throw new ApiError('That reschedule request doesn’t exist.', 404);
    const now = new Date().toISOString();
    const answered = { ...request, status: accept ? RESCHEDULE_STATUS.Accepted : RESCHEDULE_STATUS.Declined, respondedAt: now };
    const reschedules = job.reschedules.map((r) => r.id === requestId ? answered : r);
    const updated: Job = { ...job, reschedules, scheduledAt: accept ? answered.proposedStart : job.scheduledAt, updatedAt: now };
    const saved = save(updated, { type: 'reschedule_answered', request: answered }, now);
    if (accept) onJobRescheduled(saved);
    return saved;
  });
}

/* ---------- Task 57: cancellation ---------- */

/**
 * POST /jobs/:id/cancel — any cancellable status → Cancelled. The cancellation policy decides whether
 * it's allowed, the fee and whether a reason is needed (enforced again by the state machine). A vendor
 * cancelling an accepted job is counted on their profile. The other side is notified; the calendar
 * frees the slot because Cancelled isn't a booked status.
 */
export function cancelJob(jobId: string, by: JobParty, reason: string): Promise<Job> {
  return mockResponse(() => {
    const job = findJob(jobId);
    const now = new Date();
    const terms = getCancellationTerms(job, by, now);
    const updated = transition(jobId, JOB_STATUS.Cancelled, by, {
      at: now,
      note: reason.trim() || undefined,
      changes: { cancellation: { by, at: now.toISOString(), reason: reason.trim(), fee: terms.fee, rule: terms.rule } }
    });
    if (by === JOB_ACTOR.Vendor && job.status === JOB_STATUS.Scheduled && CANCELLATION_POLICY.countVendorCancellationsAfterAcceptance) {
      incrementVendorCancellations(job.vendorId);
    }
    return updated;
  });
}

/* ---------- Task 66: dispute resolution (MOCK admin action) ---------- */

/**
 * POST /admin/jobs/:id/dispute/resolve — Gwani's team closes a dispute. Uses the state machine's
 * platform-only moves: Disputed → Completed (release, or split) or Disputed → Cancelled (refund).
 * `refundAmount` is what goes back to the customer from escrow; escrow applies it on the transition.
 */
export function resolveDispute(jobId: string, outcome: DisputeOutcome, refundAmount: number): Promise<Job> {
  return mockResponse(() => {
    const job = findJob(jobId);
    if (job.status !== JOB_STATUS.Disputed || !job.dispute) throw new ApiError('This job isn’t in dispute.', 409);
    const resolution = { outcome, refundAmount: Math.max(0, Math.round(refundAmount)), at: new Date().toISOString() };
    return transition(jobId, outcome === DISPUTE_OUTCOME.RefundCustomer ? JOB_STATUS.Cancelled : JOB_STATUS.Completed, JOB_ACTOR.System, {
      note: DISPUTE_OUTCOME_LABELS[outcome],
      changes: { dispute: { ...job.dispute, resolution } }
    });
  }, 700);
}
