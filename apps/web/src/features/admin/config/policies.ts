/*
 * Admin workflow settings: claim locks, response deadlines, preset reasons and the automated moderation
 * flags. ⚠️ PLACEHOLDER values: confirm them against the build spec.
 */

export const ADMIN_POLICIES = {
  /** A claim on a verification or dispute lapses after this long without a decision, so items don't get stuck. */
  claimMinutes: 30,
  /** Each party has this long to respond when a dispute opens or the mediator asks them for evidence. */
  disputeResponseHours: 48,
  /** Disputes waiting longer than this are listed as old. */
  disputeAgeBuckets: [
  { id: 'lt1', label: 'Under 1 day', maxHours: 24 },
  { id: '1to3', label: '1–3 days', maxHours: 72 },
  { id: 'gt3', label: 'Over 3 days', maxHours: Infinity }] as
  const,
  disputeAmountBuckets: [
  { id: 'lt10', label: 'Under ₦10,000', max: 9_999 },
  { id: '10to50', label: '₦10,000–₦50,000', max: 50_000 },
  { id: 'gt50', label: 'Over ₦50,000', max: Infinity }] as
  const
} as const;

/** Preset reasons for rejecting a verification ("Other" with a text box is added by the dialog). */
export const VERIFICATION_REJECT_REASONS = [
{ id: 'unreadable', label: 'Documents are unreadable or cut off' },
{ id: 'expired', label: 'A document has expired' },
{ id: 'name_mismatch', label: 'The name doesn’t match the profile' },
{ id: 'not_original', label: 'The document looks edited or isn’t an original' },
{ id: 'wrong_type', label: 'Not an accepted document type' },
{ id: 'no_trade_evidence', label: 'No evidence of trade skills for this tier' }];


/** Preset reasons for removing content. */
export const MODERATION_REMOVE_REASONS = [
{ id: 'contact_details', label: 'Shares phone numbers, links or off-platform payment' },
{ id: 'abuse', label: 'Abusive, insulting or hateful language' },
{ id: 'misleading', label: 'Misleading, fake or not the vendor’s own work' },
{ id: 'prohibited', label: 'Prohibited item or service' },
{ id: 'inappropriate_image', label: 'Inappropriate or low-quality image' },
{ id: 'spam', label: 'Spam or repeated content' }];


/** Preset reasons for a written warning. */
export const MODERATION_WARN_REASONS = [
{ id: 'contact_details', label: 'Sharing contact details to take customers off Gwani' },
{ id: 'duplicate', label: 'Using another vendor’s photos' },
{ id: 'misleading', label: 'Misleading listings or prices' }];


/** MOCK automated flag: words and patterns that send a review or listing to the moderation queue. */
export const MODERATION_KEYWORDS = ['scam', 'fraud', 'thief', 'stupid', 'idiot', 'fool', 'useless', 'fake', 'whatsapp', 'pay me directly', 'pay through the app', 'www.', 'replica'];

/** MOCK automated flag: phone numbers in text (Nigerian mobile format). */
export const PHONE_PATTERN = /\b0[789][01]\d[\s-]?\d{3}[\s-]?\d{4}\b/;
