import i18n from './index';

/*
 * Labels that come from data (trades, tiers, statuses, plans, LGAs…) go through translation keys too.
 * Each helper takes the English label from the data as the fallback, so a new value added to the data
 * shows in English until it's translated (and, in development, logs a missing-key warning).
 *
 * Components showing these must call useTranslation() themselves (directly or via a hook), so they
 * re-render when the language changes.
 */

/** A translated label for a data value, with the data's English label as the fallback. */
export function dataLabel(key: string, fallback: string, options: Record<string, unknown> = {}): string {
  return i18n.t(key, { ...options, defaultValue: fallback });
}

const TRADE_EN: Record<string, {label: string;browse: string;}> = {
  plumber: { label: 'Plumber', browse: 'Plumbing' },
  electrician: { label: 'Electrician', browse: 'Electrical' },
  tailor: { label: 'Tailor', browse: 'Tailoring' },
  dispatch_rider: { label: 'Dispatch rider', browse: 'Logistics' },
  grocer: { label: 'Grocer', browse: 'Groceries' },
  carpenter: { label: 'Carpenter', browse: 'Carpentry' },
  mechanic: { label: 'Mechanic', browse: 'Auto repair' },
  painter: { label: 'Painter', browse: 'Painting' },
  hair_stylist: { label: 'Hair stylist', browse: 'Hair & beauty' },
  other: { label: 'Other', browse: 'Other' }
};

/** What a vendor is: "Plumber" / "Mai gyaran famfo". */
export const tradeLabel = (id: string) => dataLabel(`common:trade.${id}.label`, TRADE_EN[id]?.label ?? id);
/** What customers browse for: "Plumbing". */
export const tradeBrowseLabel = (id: string) => dataLabel(`common:trade.${id}.browse`, TRADE_EN[id]?.browse ?? id);

export const tierLabel = (id: string, fallback = id) => dataLabel(`common:tier.${id}.label`, fallback);
export const tierDescription = (id: string, fallback = '') => dataLabel(`common:tier.${id}.description`, fallback);
export const tierExplanation = (id: string, fallback = '') => dataLabel(`common:tier.${id}.explanation`, fallback);

/** LGA names are place names: the same in both languages unless a key says otherwise. */
export const lgaLabel = (lga: string) => dataLabel(`common:lga.${lga}`, lga);

export const roleLabel = (role: string, fallback = role) => dataLabel(`common:role.${role}.label`, fallback);
export const roleDescription = (role: string, fallback = '') => dataLabel(`common:role.${role}.description`, fallback);

export const productCategoryLabel = (id: string, fallback = id) => dataLabel(`common:productCategory.${id}`, fallback);
export const weekdayLabel = (id: string, fallback = id) => dataLabel(`common:weekday.${id}`, fallback);
export const weekdayShort = (id: string, fallback = id) => dataLabel(`common:weekdayShort.${id}`, fallback);

/* ---------- Jobs ---------- */

export const jobStatusLabel = (status: string, fallback = status) => dataLabel(`jobs:status.${status}.label`, fallback);
export const jobStatusDescription = (status: string, fallback = '') => dataLabel(`jobs:status.${status}.description`, fallback);
export const rescheduleStatusLabel = (status: string, fallback = status) => dataLabel(`jobs:rescheduleStatus.${status}`, fallback);
export const disputeReasonLabel = (reason: string, fallback = reason) => dataLabel(`jobs:disputeReason.${reason}`, fallback);
export const disputeOutcomeLabel = (outcome: string, fallback = outcome) => dataLabel(`jobs:disputeOutcome.${outcome}`, fallback);
export const jobActorLabel = (actor: string, fallback = actor) => dataLabel(`jobs:actor.${actor}`, fallback);
export const timeWindowLabel = (id: string, fallback = id) => dataLabel(`jobs:timeWindow.${id}`, fallback);
export const quoteDurationLabel = (hours: number, fallback?: string) =>
dataLabel(`jobs:duration.${hours}`, fallback ?? i18n.t('jobs:duration.about', { count: hours }));
export const quoteExpiryLabel = (hours: number, fallback = String(hours)) => dataLabel(`jobs:expiry.${hours}`, fallback);
export const cancelReasonLabel = (side: string, id: string, fallback = id) => dataLabel(`jobs:cancelReason.${side}.${id}`, fallback);

/* ---------- Orders ---------- */

export const orderStatusLabel = (status: string, fallback = status) => dataLabel(`jobs:order.status.${status}.label`, fallback);
export const orderStatusDescription = (status: string, fallback = '') => dataLabel(`jobs:order.status.${status}.description`, fallback);
export const fulfilmentMethodLabel = (method: string, fallback = method) => dataLabel(`jobs:order.method.${method}`, fallback);
export const orderCancelReasonLabel = (id: string, fallback = id) => dataLabel(`jobs:order.cancelReason.${id}`, fallback);

/** A vendor's next-step wording on an order: label, success, confirmTitle or confirmText. */
export const orderStepText = (status: string, field: string, fallback: string, options: Record<string, unknown> = {}) =>
dataLabel(`vendor:orders.step.${status}.${field}`, fallback, options);
export const orderDeclineReasonLabel = (id: string, fallback = id) => dataLabel(`vendor:orders.declineReasons.${id}`, fallback);

/* ---------- Vendor dashboard ---------- */

export const earningStageLabel = (stage: string, fallback = stage) => dataLabel(`vendor:earnings.stage.${stage}`, fallback);
export const reportReasonLabel = (reason: string, fallback = reason) => dataLabel(`vendor:reviews.reason.${reason}`, fallback);

export const planName = (id: string, fallback = id) => dataLabel(`vendor:plan.${id}.name`, fallback);
export const planTagline = (id: string, fallback = '') => dataLabel(`vendor:plan.${id}.tagline`, fallback);
export const planFeatureLabel = (id: string, fallback = id) => dataLabel(`vendor:plan.feature.${id}`, fallback);
const PLAN_VALUE_KEYS: Record<string, string> = {
  Unlimited: 'unlimited',
  Basic: 'basic',
  Full: 'full',
  'Full + export': 'fullExport',
  Email: 'email',
  Phone: 'phone',
  'Dedicated manager': 'manager'
};
/** A comparison-table value: numbers stay as they are, words go through keys. */
export const planValueLabel = (value: string) => PLAN_VALUE_KEYS[value] ? dataLabel(`vendor:plan.value.${PLAN_VALUE_KEYS[value]}`, value) : value;
export const planLimitWords = (key: string, count: number, fallback: string) => dataLabel(`vendor:plan.limit.${key}`, fallback, { count });
export const planLimitNoun = (key: string, fallback: string) => dataLabel(`vendor:plan.limitNoun.${key}`, fallback);
export const subscriptionStatusLabel = (status: string, fallback = status) => dataLabel(`vendor:subscription.status.${status}`, fallback);
export const invoiceKindLabel = (kind: string, fallback = kind) => dataLabel(`vendor:subscription.kind.${kind}`, fallback);
export const invoiceStatusLabel = (status: string, fallback = status) => dataLabel(`vendor:subscription.invoiceStatus.${status}`, fallback);
export const memberStatusLabel = (status: string, fallback = status) => dataLabel(`vendor:association.memberStatus.${status}`, fallback);
export const documentTypeLabel = (type: string, fallback = type) => dataLabel(`vendor:verification.docType.${type}`, fallback);
export const verificationStatusLabel = (status: string, fallback = status) => dataLabel(`vendor:verification.status.${status}`, fallback);
export const moderationKindLabel = (kind: string, fallback = kind) => dataLabel(`vendor:verification.kind.${kind}`, fallback);
export const paymentMethodLabel = (method: string, fallback = method) => dataLabel(`payments:method.${method}`, fallback);

export const profileSectionLabel = (id: string, fallback = id) => dataLabel(`vendor:profile.section.${id}.label`, fallback);
export const profileSectionDescription = (id: string, fallback = '') => dataLabel(`vendor:profile.section.${id}.description`, fallback);
const SERVICE_DURATION_KEYS: Record<string, string> = { '~1 hr': 'h1', '~1–2 hrs': 'h1to2', '~half day': 'halfDay', '~1 day': 'day1', '2+ days': 'days2' };
/** The typical-duration options stored on a service ("~1 hr"), shown in the current language. */
export const serviceDurationLabel = (value: string) => SERVICE_DURATION_KEYS[value] ? dataLabel(`vendor:profile.duration.${SERVICE_DURATION_KEYS[value]}`, value) : value;

export const stockFilterText = (id: string, field: 'label' | 'emptyTitle' | 'emptyHint', fallback: string) =>
dataLabel(`vendor:products.stockFilter.${id}.${field}`, fallback);

/* ---------- Payments ---------- */

export const paymentStatusLabel = (status: string, fallback = status) => dataLabel(`payments:status.${status}`, fallback);
export const paymentMethodDescription = (method: string, fallback = '') => dataLabel(`payments:methodDescription.${method}`, fallback);
export const escrowStatusLabel = (status: string, fallback = status) => dataLabel(`payments:escrowStatus.${status}`, fallback);
export const escrowEventLabel = (type: string, fallback = type) => dataLabel(`payments:escrowEvent.${type}`, fallback);
export const transactionStatusLabel = (status: string, fallback = status) => dataLabel(`payments:txStatus.${status}`, fallback);
export const transactionTypeLabel = (type: string, fallback = type) => dataLabel(`payments:txType.${type}`, fallback);
