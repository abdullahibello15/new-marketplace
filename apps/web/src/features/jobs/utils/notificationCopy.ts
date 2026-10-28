import { recipientLanguage, tIn } from '../../../i18n/recipient';
import { formatDateIn, formatNaira } from '../../../utils/format';
import { AUTO_CONFIRM_HOURS, JOB_ACTOR, JOB_STATUS, RESCHEDULE_STATUS } from '../constants';
import { autoConfirmAt } from '../stateMachine';
import type { Job, JobParty, JobStatusChange, RescheduleRequest } from '../types';

export type JobEvent =
{type: 'status';change: JobStatusChange;} |
{type: 'reschedule_requested';request: RescheduleRequest;} |
{type: 'reschedule_answered';request: RescheduleRequest;};

export interface NotificationDraft {
  recipient: JobParty;
  title: string;
  body: string;
}

const other = (party: JobParty): JobParty => party === JOB_ACTOR.Customer ? JOB_ACTOR.Vendor : JOB_ACTOR.Customer;
const nameOf = (job: Job, party: JobParty) => party === JOB_ACTOR.Customer ? job.customerName : job.vendorName;

/** What a draft needs to be filled in: the wording key, and its values in the recipient's language. */
type Values = (when: (iso: string, pattern?: string) => string) => Record<string, unknown>;

/**
 * Who hears about an event, and what it says. One entry per person notified, each written in that
 * person's saved language (jobs:notify.* in the locale files).
 */
export function notificationsFor(job: Job, event: JobEvent): NotificationDraft[] {
  const to = (recipient: JobParty, key: string, values: Values = () => ({})): NotificationDraft => {
    const language = recipientLanguage(recipient, recipient === JOB_ACTOR.Customer ? job.customerId : job.vendorId);
    const t = tIn(language);
    const when = (iso: string, pattern = 'EEE d MMM, h:mm a') => formatDateIn(iso, pattern, language);
    const all = { ref: t('jobs:notify.ref', { id: job.id }), ...values(when) };
    return { recipient, title: t(`jobs:notify.${key}.title`, all), body: t(`jobs:notify.${key}.body`, all) };
  };

  if (event.type === 'reschedule_requested') {
    const r = event.request;
    return [to(other(r.requestedBy), 'rescheduleRequested', (when) => ({ name: nameOf(job, r.requestedBy), date: when(r.proposedStart) }))];
  }
  if (event.type === 'reschedule_answered') {
    const r = event.request;
    const accepted = r.status === RESCHEDULE_STATUS.Accepted;
    return [
    to(r.requestedBy, accepted ? 'rescheduleAccepted' : 'rescheduleDeclined', (when) => ({
      name: nameOf(job, other(r.requestedBy)),
      date: when(accepted ? r.proposedStart : r.fromStart)
    }))];

  }

  const { status, by } = event.change;
  const viaSystem = by === JOB_ACTOR.System;
  switch (status) {
    case JOB_STATUS.Requested:
      return [to('vendor', job.serviceName ? 'requested' : 'requestedNoService', () => ({ name: job.customerName, service: job.serviceName, place: job.address.placeLabel }))];
    case JOB_STATUS.Quoted:
      return [to('customer', 'quoted', () => ({ name: job.vendorName, amount: job.quote ? formatNaira(job.quote.amount) : '' }))];
    case JOB_STATUS.Scheduled:
      return [to('vendor', job.scheduledAt ? 'scheduled' : 'scheduledNoTime', (when) => ({ name: job.customerName, date: job.scheduledAt ? when(job.scheduledAt) : '' }))];
    case JOB_STATUS.QuoteRejected:
      return [to('vendor', 'quoteRejected', () => ({ name: job.customerName }))];
    case JOB_STATUS.Declined:
      return [to('customer', 'declined', () => ({ name: job.vendorName }))];
    case JOB_STATUS.InProgress:
      return [to('customer', 'inProgress', (when) => ({ name: job.vendorName, time: when(event.change.at, 'h:mm a') }))];
    case JOB_STATUS.AwaitingConfirmation:{
        const deadline = autoConfirmAt(job);
        return [
        to('customer', deadline ? 'awaitingConfirmation' : 'awaitingConfirmationNoDeadline', (when) => ({
          name: job.vendorName,
          date: deadline ? when(deadline.toISOString()) : ''
        }))];

      }
    case JOB_STATUS.Completed:
      if (job.dispute?.resolution) return [to('customer', 'disputeResolved'), to('vendor', 'disputeResolved')];
      return viaSystem ?
      [
      to('customer', 'autoConfirmedCustomer', () => ({ hours: AUTO_CONFIRM_HOURS })),
      to('vendor', 'autoConfirmedVendor', () => ({ hours: AUTO_CONFIRM_HOURS, name: job.customerName }))] :

      [to('vendor', 'confirmed', () => ({ name: job.customerName }))];
    case JOB_STATUS.Disputed:
      return [to('vendor', 'disputedVendor', () => ({ name: job.customerName })), to('customer', 'disputedCustomer')];
    case JOB_STATUS.Closed:
      return job.review ?
      [to('vendor', 'reviewed', () => ({ name: job.customerName, rating: job.review?.rating }))] :
      [to('vendor', 'closed')];
    case JOB_STATUS.Cancelled:{
        if (by === JOB_ACTOR.System) return [to('customer', 'cancelledSystem'), to('vendor', 'cancelledSystem')];
        const note = event.change.note;
        const key = note ? job.scheduledAt ? 'cancelledReasonSlot' : 'cancelledReason' : job.scheduledAt ? 'cancelledSlot' : 'cancelled';
        return [to(other(by), key, () => ({ name: nameOf(job, by), reason: note }))];
      }
  }
}
