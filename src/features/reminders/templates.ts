import { format, isSameDay, addDays } from 'date-fns';
import type { JobParty } from '../jobs/types';
import type { ReminderMessage, ReminderRuleId } from './types';

/**
 * Every booking reminder's wording, in one file. Placeholders in [brackets] are filled by renderTemplate:
 *   [service]  what's booked, e.g. "Pipe fitting & repair"
 *   [vendor]   the vendor's business name
 *   [customer] the customer's name
 *   [day]      "today", "tomorrow" or "on Tue 7 Oct", relative to when the reminder goes out
 *   [time]     start time, e.g. "10:00 AM"
 *   [address]  landmark and area, e.g. "Behind NEPA office, Tunga, Minna"
 *   [lead]     how far ahead, from the rule, e.g. "2 hours"
 *   [ref]      the job number, e.g. "#2291"
 * SMS should fit one 160-character segment once filled in; the dev panel flags any that don't.
 */
export const REMINDER_TEMPLATES: Record<ReminderRuleId, Record<JobParty, {pushTitle: string;pushBody: string;sms: string;}>> = {
  day_before: {
    customer: {
      pushTitle: 'Booking tomorrow',
      pushBody: 'Reminder: your [service] with [vendor] is [day] at [time]. [address]',
      sms: 'Gwani: Your [service] with [vendor] is [day] at [time]. [address]'
    },
    vendor: {
      pushTitle: 'Job tomorrow',
      pushBody: 'Reminder: [service] for [customer] is [day] at [time]. [address]',
      sms: 'Gwani: Job [ref] for [customer] is [day] at [time]. [address]'
    }
  },
  two_hours: {
    customer: {
      pushTitle: 'Starting in [lead]',
      pushBody: 'Your [service] with [vendor] starts in [lead], at [time]. [address]',
      sms: 'Gwani: Your [service] with [vendor] starts in [lead], at [time]. [address]'
    },
    vendor: {
      pushTitle: 'Job in [lead]',
      pushBody: '[service] for [customer] starts in [lead], at [time]. [address]',
      sms: 'Gwani: Job [ref] for [customer] starts in [lead], at [time]. [address]'
    }
  }
};

export type TemplateValues = Record<'service' | 'vendor' | 'customer' | 'day' | 'time' | 'address' | 'lead' | 'ref', string>;

/** Fills [placeholders]. Unknown ones are left as typed, so a typo shows up in the dev panel instead of vanishing. */
export function renderTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\[(\w+)\]/g, (match, key: string) => key in values ? values[key as keyof TemplateValues] : match).replace(/\s+/g, ' ').trim();
}

/** "today", "tomorrow" or "on Tue 7 Oct": the start day as the person reading the reminder sees it. */
export function relativeDay(start: Date, readAt: Date): string {
  if (isSameDay(start, readAt)) return 'today';
  if (isSameDay(start, addDays(readAt, 1))) return 'tomorrow';
  return `on ${format(start, 'EEE d MMM')}`;
}

export function renderReminder(ruleId: ReminderRuleId, recipient: JobParty, values: TemplateValues): ReminderMessage {
  const t = REMINDER_TEMPLATES[ruleId][recipient];
  return { pushTitle: renderTemplate(t.pushTitle, values), pushBody: renderTemplate(t.pushBody, values), sms: renderTemplate(t.sms, values) };
}
