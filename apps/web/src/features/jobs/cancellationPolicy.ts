import { differenceInMinutes } from 'date-fns';
import i18n from '../../i18n';
import { formatNaira } from '../../utils/format';
import { JOB_STATUS } from './constants';
import type { Job, JobActor, JobParty, JobStatus } from './types';

/*
 * THE cancellation policy. Edit the numbers and lists here; the state machine, the job service, the
 * cancel dialogs and the policy summaries on the request form and quote card all read from this file.
 */
export const CANCELLATION_POLICY = {
  /** Cancelling a booked job more than this many hours before the start is free. */
  freeCancellationHours: 24,
  /** Customer late-cancellation fee (MOCK: shown, never charged), as a share of the agreed price. */
  lateFee: { percent: 20, minimum: 1_000, maximum: 20_000 },
  /** Statuses each side may cancel from. Vendors turn down new requests with Decline instead. */
  cancellableFrom: {
    customer: [JOB_STATUS.Requested, JOB_STATUS.Quoted, JOB_STATUS.Scheduled],
    vendor: [JOB_STATUS.Quoted, JOB_STATUS.Scheduled]
  } satisfies Record<JobParty, JobStatus[]>,
  /** Statuses where the customer must use "Report a problem" instead of cancelling. */
  reportInsteadFrom: [JOB_STATUS.InProgress, JOB_STATUS.AwaitingConfirmation] as JobStatus[],
  /** When a reason is required: 'always', only 'after_acceptance' (Scheduled), or 'never'. */
  reasonRequired: { customer: 'always', vendor: 'always' } as Record<JobParty, 'always' | 'after_acceptance' | 'never'>,
  /** Vendor cancellations after acceptance are counted on the vendor's profile. */
  countVendorCancellationsAfterAcceptance: true
} as const;

export const CANCEL_REASONS: Record<JobParty, {id: string;label: string;}[]> = {
  customer: [
  { id: 'no_longer_needed', label: 'I don’t need it any more' },
  { id: 'found_someone_else', label: 'I found someone else' },
  { id: 'time_doesnt_work', label: 'The time no longer works for me' },
  { id: 'price_too_high', label: 'The price is too high' }],

  vendor: [
  { id: 'unavailable', label: 'I’m no longer available at that time' },
  { id: 'emergency', label: 'Personal or family emergency' },
  { id: 'materials', label: 'I can’t get the parts or materials' },
  { id: 'out_of_area', label: 'The job is outside my area' }]

};

export type CancellationRule = 'before_acceptance' | 'free_window' | 'late' | 'report_instead' | 'not_allowed';

export interface CancellationTerms {
  allowed: boolean;
  /** Whole Naira; 0 when free. MOCK: displayed only, never charged. */
  fee: number;
  /** Shown prominently in the dialog, e.g. the late-cancellation warning. */
  warning: string | null;
  reasonRequired: boolean;
  rule: CancellationRule;
  /** One-line explanation of the rule that applies, for the dialog. */
  summary: string;
  /** Why cancelling isn't possible, when `allowed` is false. */
  blockedReason: string | null;
}

const HOURS = CANCELLATION_POLICY.freeCancellationHours;

export function lateFeeFor(agreedPrice: number | null): number {
  if (!agreedPrice) return 0;
  const { percent, minimum, maximum } = CANCELLATION_POLICY.lateFee;
  return Math.min(maximum, Math.max(minimum, Math.round(agreedPrice * percent / 100 / 100) * 100));
}

function blocked(rule: CancellationRule, reason: string): CancellationTerms {
  return { allowed: false, fee: 0, warning: null, reasonRequired: false, rule, summary: reason, blockedReason: reason };
}

/**
 * What happens if `actor` cancels `job` now. The single source of truth: the UI uses it to build the
 * dialog, and the state machine uses it to allow or refuse the Cancelled transition.
 */
export function getCancellationTerms(job: Pick<Job, 'status' | 'scheduledAt' | 'agreedPrice'>, actor: JobActor, now = new Date()): CancellationTerms {
  // The platform (expired quotes, dispute outcomes) is never bound by the customer/vendor policy.
  if (actor === 'system') return { allowed: true, fee: 0, warning: null, reasonRequired: false, rule: 'before_acceptance', summary: '', blockedReason: null };

  if (actor === 'customer' && CANCELLATION_POLICY.reportInsteadFrom.includes(job.status)) {
    return blocked('report_instead', i18n.t('jobs:policy.blockedStarted'));
  }
  if (!CANCELLATION_POLICY.cancellableFrom[actor].some((s) => s === job.status)) {
    return blocked(
      'not_allowed',
      actor === 'vendor' && job.status === JOB_STATUS.Requested ?
      i18n.t('jobs:policy.blockedVendorDecline') :
      i18n.t('jobs:policy.blockedStage')
    );
  }

  const reasonRule = CANCELLATION_POLICY.reasonRequired[actor];
  const accepted = job.status === JOB_STATUS.Scheduled;
  const reasonRequired = reasonRule === 'always' || reasonRule === 'after_acceptance' && accepted;

  if (!accepted || !job.scheduledAt) {
    return {
      allowed: true,
      fee: 0,
      warning: null,
      reasonRequired,
      rule: 'before_acceptance',
      summary: i18n.t('jobs:policy.freeBefore'),
      blockedReason: null
    };
  }

  const minutesToStart = differenceInMinutes(new Date(job.scheduledAt), now);
  if (minutesToStart > HOURS * 60) {
    return {
      allowed: true,
      fee: 0,
      warning: actor === 'vendor' && CANCELLATION_POLICY.countVendorCancellationsAfterAcceptance ? i18n.t('jobs:policy.vendorRecorded') : null,
      reasonRequired,
      rule: 'free_window',
      summary: i18n.t('jobs:policy.freeWindow', { hours: HOURS }),
      blockedReason: null
    };
  }

  if (actor === 'customer') {
    const fee = lateFeeFor(job.agreedPrice);
    return {
      allowed: true,
      fee,
      warning: fee ? i18n.t('jobs:policy.lateCustomerFee', { hours: HOURS, fee: formatNaira(fee) }) : i18n.t('jobs:policy.lateCustomer', { hours: HOURS }),
      reasonRequired,
      rule: 'late',
      summary: i18n.t('jobs:policy.lateSummary', { hours: HOURS }),
      blockedReason: null
    };
  }
  return {
    allowed: true,
    fee: 0,
    warning: i18n.t('jobs:policy.lateVendor', { hours: HOURS }),
    reasonRequired,
    rule: 'late',
    summary: i18n.t('jobs:policy.lateSummary', { hours: HOURS }),
    blockedReason: null
  };
}

/** Short, human summary of the policy for the request form and quote card. */
export function cancellationPolicyLines(): string[] {
  const { percent, minimum } = CANCELLATION_POLICY.lateFee;
  return [
  i18n.t('jobs:policy.line1'),
  i18n.t('jobs:policy.line2', { hours: HOURS }),
  i18n.t('jobs:policy.line3', { hours: HOURS, percent, minimum: formatNaira(minimum) }),
  i18n.t('jobs:policy.line4')];

}
