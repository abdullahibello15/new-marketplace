import { addDays, addHours, subMinutes } from 'date-fns';
import { date, message, nested, type Message } from '../../domain/message';
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
 *   Declined  Quote Rejected  Cancelled                   Disputed ──(review team)──▶ Completed / Cancelled,
 *                                                            or dismissed: back to In Progress / Awaiting confirmation
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
    cancelled: [System],
    // Dismissed: back to where it was when the problem was reported.
    in_progress: [System],
    awaiting_confirmation: [System]
  },
  closed: {},
  declined: {},
  quote_rejected: {},
  cancelled: {}
};

type Guard = (job: Job, now: Date) => Message | null;

/**
 * Timing rules that sit on top of the table: a move can be allowed in principle but not yet.
 * Each returns a reason when the move is blocked right now, or null when it can go ahead.
 */
const GUARDS: Partial<Record<`${JobStatus}>${JobStatus}`, Partial<Record<JobActor, Guard>>>> = {
  'quoted>scheduled': { customer: quoteStillOpen },
  'quoted>quote_rejected': { customer: quoteStillOpen },
  'scheduled>in_progress': {
    vendor: (job, now) => {
      if (!job.scheduledAt) return message('jobs:error.noTime');
      const opensAt = subMinutes(new Date(job.scheduledAt), START_JOB_EARLY_MINUTES);
      return now < opensAt ? message('jobs:error.startFrom', { date: date(opensAt, 'weekdayDateTime') }) : null;
    }
  },
  'awaiting_confirmation>completed': {
    system: (job, now) => {
      const doneAt = reachedAt(job, JOB_STATUS.AwaitingConfirmation);
      return doneAt && now >= addHours(new Date(doneAt), AUTO_CONFIRM_HOURS) ? null : message('jobs:error.stillTime');
    }
  },
  'disputed>in_progress': { system: (job) => statusBeforeDispute(job) === JOB_STATUS.InProgress ? null : message('jobs:error.wasntInProgress') },
  'disputed>awaiting_confirmation': {
    system: (job) => statusBeforeDispute(job) === JOB_STATUS.AwaitingConfirmation ? null : message('jobs:error.wasntAwaiting')
  },
  'completed>closed': {
    system: (job, now) => {
      const completedAt = reachedAt(job, JOB_STATUS.Completed);
      return completedAt && now >= addDays(new Date(completedAt), AUTO_CLOSE_DAYS) ? null : message('jobs:error.reviewOpen');
    }
  }
};

function quoteStillOpen(job: Job, now: Date): Message | null {
  if (!job.quote) return message('jobs:error.noQuote');
  return new Date(job.quote.expiresAt) <= now ? message('jobs:error.quoteExpired') : null;
}

/** A status label as a message, with the English label from JOB_STATUS_META as the fallback. */
const statusLabel = (status: JobStatus) => message(`jobs:status.${status}.label`, undefined, JOB_STATUS_META[status].label);

/** Thrown by applyTransition; `reason` says why, as a message (the Error message is its key). */
export class JobTransitionError extends Error {
  constructor(readonly reason: Message) {
    super(reason.key);
    this.name = 'JobTransitionError';
  }
}

/** The status a job had just before its latest dispute (where a dismissed dispute returns it). */
export function statusBeforeDispute(job: Pick<Job, 'history'>): JobStatus | null {
  const i = job.history.map((h) => h.status).lastIndexOf(JOB_STATUS.Disputed);
  return i > 0 ? job.history[i - 1].status : null;
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
export function transitionBlockedReason(job: Job, to: JobStatus, by: JobActor, now = new Date(), { note }: {note?: string;} = {}): Message | null {
  const from = statusLabel(job.status);
  if (isEndState(job.status)) return message('jobs:error.ended', { status: nested(from, { case: 'lower' }) });
  if (to === JOB_STATUS.Cancelled) {
    // One policy for every cancellation: the same terms the cancel dialog shows. Checked before the
    // table so a refusal explains the policy ("use Report a problem") rather than a bare status rule.
    const terms = getCancellationTerms(job, by, now);
    if (!terms.allowed) return terms.blockedReason;
    if (terms.reasonRequired && !note?.trim()) return message('jobs:error.cancelReason');
  }
  if (!canTransition(job.status, to, by)) {
    const labels = { from: nested(from), to: nested(statusLabel(to)) };
    return by === System ? message('jobs:error.cantMove', labels) : message('jobs:error.cantMoveBy', { ...labels, by: nested(message(`jobs:actor.${by}`), { case: 'lower' }) });
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
