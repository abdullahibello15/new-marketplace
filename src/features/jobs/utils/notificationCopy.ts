import { format } from 'date-fns';
import { formatNaira } from '../../../utils/format';
import { JOB_ACTOR, JOB_STATUS, RESCHEDULE_STATUS } from '../constants';
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

const when = (iso: string) => format(new Date(iso), 'EEE d MMM, h:mm a');
const other = (party: JobParty): JobParty => party === JOB_ACTOR.Customer ? JOB_ACTOR.Vendor : JOB_ACTOR.Customer;
const nameOf = (job: Job, party: JobParty) => party === JOB_ACTOR.Customer ? job.customerName : job.vendorName;

/** Who hears about an event, and what it says. One entry per person notified. */
export function notificationsFor(job: Job, event: JobEvent): NotificationDraft[] {
  const ref = `job #${job.id}`;

  if (event.type === 'reschedule_requested') {
    const r = event.request;
    return [{
      recipient: other(r.requestedBy),
      title: 'Reschedule requested',
      body: `${nameOf(job, r.requestedBy)} asked to move ${ref} to ${when(r.proposedStart)}. Please accept or decline.`
    }];
  }
  if (event.type === 'reschedule_answered') {
    const r = event.request;
    const accepted = r.status === RESCHEDULE_STATUS.Accepted;
    return [{
      recipient: r.requestedBy,
      title: accepted ? 'Reschedule accepted' : 'Reschedule declined',
      body: accepted ?
      `${nameOf(job, other(r.requestedBy))} agreed. ${ref} is now on ${when(r.proposedStart)}.` :
      `${nameOf(job, other(r.requestedBy))} declined. ${ref} stays on ${when(r.fromStart)}.`
    }];
  }

  const { status, by } = event.change;
  const viaSystem = by === JOB_ACTOR.System;
  switch (status) {
    case JOB_STATUS.Requested:
      return [{ recipient: 'vendor', title: 'New job request', body: `${job.customerName} needs ${job.serviceName ?? 'a job done'} in ${job.address.placeLabel}.` }];
    case JOB_STATUS.Quoted:
      return [{ recipient: 'customer', title: 'Quote received', body: `${job.vendorName} quoted ${job.quote ? formatNaira(job.quote.amount) : 'a price'} for ${ref}.` }];
    case JOB_STATUS.Scheduled:
      return [{ recipient: 'vendor', title: 'Quote accepted', body: `${job.customerName} accepted your quote. ${ref} is booked for ${job.scheduledAt ? when(job.scheduledAt) : 'the agreed time'}.` }];
    case JOB_STATUS.QuoteRejected:
      return [{ recipient: 'vendor', title: 'Quote rejected', body: `${job.customerName} turned down your quote for ${ref}.` }];
    case JOB_STATUS.Declined:
      return [{ recipient: 'customer', title: 'Request declined', body: `${job.vendorName} can’t take ${ref}.` }];
    case JOB_STATUS.InProgress:
      return [{ recipient: 'customer', title: 'Vendor has arrived', body: `${job.vendorName} arrived at ${format(new Date(event.change.at), 'h:mm a')} and started ${ref}.` }];
    case JOB_STATUS.AwaitingConfirmation:{
        const deadline = autoConfirmAt(job);
        return [{
          recipient: 'customer',
          title: 'Please confirm the work',
          body: `${job.vendorName} marked ${ref} as done. Confirm it or report a problem${deadline ? ` by ${when(deadline.toISOString())}` : ''}.`
        }];
      }
    case JOB_STATUS.Completed:
      return viaSystem ?
      [
      { recipient: 'customer', title: 'Job confirmed automatically', body: `We confirmed ${ref} because there was no reply within 48 hours.` },
      { recipient: 'vendor', title: 'Job confirmed automatically', body: `${ref} was confirmed after 48 hours with no reply from ${job.customerName}.` }] :

      [{ recipient: 'vendor', title: 'Job confirmed', body: `${job.customerName} confirmed ${ref} is complete.` }];
    case JOB_STATUS.Disputed:
      return [
      { recipient: 'vendor', title: 'Problem reported', body: `${job.customerName} reported a problem with ${ref}. Gwani’s team will review it.` },
      { recipient: 'customer', title: 'We’ve got your report', body: `Gwani’s team will review ${ref} and contact you within 2 working days.` }];

    case JOB_STATUS.Closed:
      return job.review ?
      [{ recipient: 'vendor', title: 'New review', body: `${job.customerName} left a ${job.review.rating}★ review on ${ref}.` }] :
      [{ recipient: 'vendor', title: 'Job closed', body: `${ref} is closed.` }];
    case JOB_STATUS.Cancelled:
      if (by === JOB_ACTOR.System) {
        return [{ recipient: 'customer', title: 'Job cancelled', body: `${ref} was cancelled.` }, { recipient: 'vendor', title: 'Job cancelled', body: `${ref} was cancelled.` }];
      }
      return [{ recipient: other(by), title: 'Job cancelled', body: `${nameOf(job, by)} cancelled ${ref}.` }];
  }
}
