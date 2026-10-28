/*
 * Response-time SLA rules: the ONE place that says how fast vendors must respond. The SLA helper (sla.ts),
 * the admin SLA dashboard and the public "Usually responds within…" line all read this.
 *
 * ⚠️ PLACEHOLDER values: confirm every target against the build spec.
 *
 * How a target applies (see slaDeadline in sla.ts):
 *  - A request that arrives DURING the vendor's working hours must be answered within `withinHoursMinutes`
 *    of working time. The clock pauses outside working hours and on the vendor's blocked days.
 *  - A request that arrives OUTSIDE working hours (evening, closed day, blocked day) is due at whichever
 *    is later: `afterHoursWallClockMinutes` of real time, or `withinHoursMinutes` of working time after the
 *    vendor next opens. So nobody breaches overnight or over a weekend before they've had a fair chance.
 */

export const SLA_TYPE = {
  FirstResponse: 'first_response',
  Quote: 'quote',
  OrderConfirm: 'order_confirm',
  DisputeResponse: 'dispute_response',
  RescheduleResponse: 'reschedule_response'
} as const;

export type SlaType = (typeof SLA_TYPE)[keyof typeof SLA_TYPE];

export interface SlaRule {
  label: string;
  description: string;
  /** Working-time minutes allowed when the request arrives during working hours. */
  withinHoursMinutes: number;
  /** Real-time minutes allowed when it arrives outside working hours (or working time after opening, if later). */
  afterHoursWallClockMinutes: number;
}

export const SLA_RULES: Record<SlaType, SlaRule> = {
  first_response: {
    label: 'First response',
    description: 'From a new job request or order to the vendor’s first reply (a quote, a decline, or confirming the order).',
    withinHoursMinutes: 2 * 60, // PLACEHOLDER
    afterHoursWallClockMinutes: 12 * 60 // PLACEHOLDER
  },
  quote: {
    label: 'Quote sent',
    description: 'From a job request to the vendor sending a quote.',
    withinHoursMinutes: 4 * 60, // PLACEHOLDER
    afterHoursWallClockMinutes: 24 * 60 // PLACEHOLDER
  },
  order_confirm: {
    label: 'Order confirmed',
    description: 'From a retail order being placed to the vendor confirming it (or saying it’s out of stock).',
    withinHoursMinutes: 2 * 60, // PLACEHOLDER
    afterHoursWallClockMinutes: 12 * 60 // PLACEHOLDER
  },
  dispute_response: {
    label: 'Dispute response',
    description: 'From a reported problem (or Gwani asking for evidence) to the vendor’s answer.',
    withinHoursMinutes: 8 * 60, // PLACEHOLDER: one working day
    afterHoursWallClockMinutes: 24 * 60 // PLACEHOLDER
  },
  reschedule_response: {
    label: 'Reschedule reply',
    description: 'From a customer asking to move a booking to the vendor accepting or declining.',
    withinHoursMinutes: 4 * 60, // PLACEHOLDER
    afterHoursWallClockMinutes: 24 * 60 // PLACEHOLDER
  }
};

export const SLA_SETTINGS = {
  /** A vendor with at least this many breaches in the period is "at risk". PLACEHOLDER */
  repeatBreachThreshold: 3,
  /** "Usually responds within…": median working-time first response over this many past days… PLACEHOLDER */
  typicalWindowDays: 90,
  /** …once there are at least this many responses (otherwise nothing is shown). */
  typicalMinSamples: 3,
  /** How far ahead to look for the next working time before giving up (a vendor with no open days). */
  maxLookaheadDays: 60
} as const;
