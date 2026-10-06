import { addDays, addHours, format, subMinutes } from 'date-fns';
import {
  AUTO_CLOSE_DAYS,
  AUTO_CONFIRM_HOURS,
  JOB_ACTOR,
  JOB_SIDE_BRANCHES,
  JOB_STATUS,
  JOB_STATUS_META,
  START_JOB_EARLY_MINUTES } from
'./constants';
import { getCancellationTerms } from './cancellationPolicy';
import type { Job, JobActor, JobStatus } from './types';

/**
 * The job lifecycle, as data. For each status: where it may go next, and who may move it there.
 * Anything not listed is rejected. A status with no entries is an end state.
 *
 *   Requested ─▶ Quoted ─▶ Scheduled ─▶ In Progress ─▶ Awaiting confirmation ─▶ Completed ─▶ Closed
 *      │decline    │reject     │cancel        └──report a problem──┤
 *      ▼           ▼           ▼                             ▼
 *   Declined  Quote Rejected  Cancelled                   Disputed ──(review team)──▶ Completed / Cancelled
 *
 * Who may cancel, when, with what fee and whether a reason is needed comes from cancellationPolicy.ts.
 */
const { Customer, Vendor, System } = JOB_ACTOR;

export const JOB_TRANSITIONS: Record<JobStatus, Partial<Record<JobStatus, readonly JobActor[]>>> = {
  requested: {
    quoted: [Vendor],
    declined: [Vendor],
    cancelled: [Customer]
  },
  quoted: {
    scheduled: [Customer],
    quote_rejected: [Customer],
    cancelled: [Customer, Vendor, System]
  },
  scheduled: {
    // "I've arrived / Start job"
    in_progress: [Vendor],
    cancelled: [Customer, Vendor]
  },
  in_progress: {
    // "Mark work done": the customer then confirms.
    awaiting_confirmation: [Vendor],
    // The customer can't cancel once work has started (see cancellationPolicy), but can report a problem.
    disputed: [Customer]
  },
  awaiting_confirmation: {
    // The customer confirms, or the platform does after AUTO_CONFIRM_HOURS.
    completed: [Customer, System],
    disputed: [Customer]
  },
  completed: {
    // After the review step (left or skipped), or automatically after AUTO_CLOSE_DAYS.
    closed: [Customer, System]
  },
  disputed: {
    // Resolved by Gwani's review team only.
    completed: [System],
    cancelled: [System]
  },
  closed: {},
  declined: {},
  quote_rejected: {},
  cancelled: {}
};

type Guard = (job: Job, now: Date) => string | null;

/**
 * Timing rules that sit on top of the table: a move can be allowed in principle but not yet.
 * Each returns a reason when the move is blocked right now, or null when it can go ahead.
 */
const GUARDS: Partial<Record<`${JobStatus}>${JobStatus}`, Partial<Record<JobActor, Guard>>>> = {
  'quoted>scheduled': { customer: quoteStillOpen },
  'quoted>quote_rejected': { customer: quoteStillOpen },
  'scheduled>in_progress': {
    vendor: (job, now) => {
      if (!job.scheduledAt) return 'This job has no booked time.';
      const opensAt = subMinutes(new Date(job.scheduledAt), START_JOB_EARLY_MINUTES);
      return now < opensAt ? `You can start this job from ${format(opensAt, 'EEE d MMM, h:mm a')}.` : null;
    }
  },
  'awaiting_confirmation>completed': {
    system: (job, now) => {
      const doneAt = reachedAt(job, JOB_STATUS.AwaitingConfirmation);
      return doneAt && now >= addHours(new Date(doneAt), AUTO_CONFIRM_HOURS) ? null : 'The customer still has time to confirm.';
    }
  },
  'completed>closed': {
    system: (job, now) => {
      const completedAt = reachedAt(job, JOB_STATUS.Completed);
      return completedAt && now >= addDays(new Date(completedAt), AUTO_CLOSE_DAYS) ? null : 'The review window is still open.';
    }
  }
};

function quoteStillOpen(job: Job, now: Date): string | null {
  if (!job.quote) return 'There’s no quote to respond to yet.';
  return new Date(job.quote.expiresAt) <= now ? 'This quote has expired. Ask the vendor for a new one.' : null;
}

export class JobTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobTransitionError';
  }
}

/** When the job last reached a status, from its history. */
export function reachedAt(job: Pick<Job, 'history'>, status: JobStatus): string | null {
  return [...job.history].reverse().find((h) => h.status === status)?.at ?? null;
}

/** Is the move in the table at all (ignoring timing)? */
export function canTransition(from: JobStatus, to: JobStatus, by: JobActor): boolean {
  return JOB_TRANSITIONS[from][to]?.includes(by) ?? false;
}

/**
 * Why `by` can't move the job to `to` right now, or null if they can. Covers the table, the timing guards and
 * the cancellation policy (including its reason requirement, checked against `note`).
 */
export function transitionBlockedReason(job: Job, to: JobStatus, by: JobActor, now = new Date(), { note }: {note?: string;} = {}): string | null {
  const from = JOB_STATUS_META[job.status].label;
  if (isEndState(job.status)) return `This job is already ${from.toLowerCase()} and can’t change.`;
  if (to === JOB_STATUS.Cancelled) {
    // One policy for every cancellation: the same terms the cancel dialog shows. Checked before the
    // table so a refusal explains the policy ("use Report a problem") rather than a bare status rule.
    const terms = getCancellationTerms(job, by, now);
    if (!terms.allowed) return terms.blockedReason;
    if (terms.reasonRequired && !note?.trim()) return 'Please give a reason for cancelling.';
  }
  if (!canTransition(job.status, to, by)) {
    return `A job can’t go from ${from} to ${JOB_STATUS_META[to].label}${by === System ? '' : ` by the ${by}`}.`;
  }
  return GUARDS[`${job.status}>${to}`]?.[by]?.(job, now) ?? null;
}

/** Statuses `by` may move a job to from `from` (ignoring timing). Empty for end states. */
export function allowedTransitions(from: JobStatus, by: JobActor): JobStatus[] {
  return (Object.entries(JOB_TRANSITIONS[from]) as [JobStatus, readonly JobActor[]][]).
  filter(([, actors]) => actors.includes(by)).
  map(([to]) => to);
}

export const isEndState = (status: JobStatus) => Object.keys(JOB_TRANSITIONS[status]).length === 0;

/**
 * The only way to change a job's status. Checks the move is allowed for this actor right now, then
 * returns a new job with the status set and a history entry appended. `changes` sets related fields
 * (e.g. the quote, the arrival) in the same step. Throws JobTransitionError otherwise.
 */
export function applyTransition(
job: Job,
to: JobStatus,
by: JobActor,
{ note, changes, at = new Date() }: {note?: string;changes?: Partial<Omit<Job, 'status' | 'history'>>;at?: Date;} = {})
: Job {
  const blocked = transitionBlockedReason(job, to, by, at, { note });
  if (blocked) throw new JobTransitionError(blocked);
  const timestamp = at.toISOString();
  return {
    ...job,
    ...changes,
    status: to,
    history: [...job.history, { status: to, at: timestamp, by, ...(note ? { note } : {}) }],
    updatedAt: timestamp
  };
}

/** Where a job left the main path, for the timeline: the last main-path status it reached. */
export function lastMainPathStatus(job: Pick<Job, 'history'>): JobStatus {
  const onPath = job.history.filter((h) => !JOB_SIDE_BRANCHES.includes(h.status));
  return onPath[onPath.length - 1]?.status ?? JOB_STATUS.Requested;
}

/** When the platform will confirm the work if the customer doesn't (null unless awaiting confirmation). */
export function autoConfirmAt(job: Job): Date | null {
  const doneAt = job.status === JOB_STATUS.AwaitingConfirmation ? reachedAt(job, JOB_STATUS.AwaitingConfirmation) : null;
  return doneAt ? addHours(new Date(doneAt), AUTO_CONFIRM_HOURS) : null;
}
