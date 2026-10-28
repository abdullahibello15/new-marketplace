/*
 * The moderation guidelines moderators open beside each item. Static: edit the rules here.
 * ⚠️ PLACEHOLDER wording: confirm against Gwani's published community rules.
 */

export interface GuidelineSection {
  id: 'profile_photos' | 'reviews' | 'catalogue' | 'reports' | 'sanctions';
  title: string;
  rules: string[];
}

export const MODERATION_GUIDELINES: readonly GuidelineSection[] = [
{
  id: 'profile_photos',
  title: 'Profile photos',
  rules: [
  'Shows the vendor, their team, their shop sign or their own work. No stock photos or other businesses’ logos.',
  'No phone numbers, WhatsApp handles or website addresses in the image.',
  'No nudity, weapons or violent images. Clear enough to recognise at thumbnail size.',
  'A photo used by another vendor (duplicate flag) is removed unless the owner shows it’s theirs.']

},
{
  id: 'reviews',
  title: 'Customer reviews',
  rules: [
  'Keep honest negative reviews, even harsh ones, if they describe the customer’s own experience.',
  'Remove insults aimed at a person (e.g. “idiot”, “thief”) unless the review is about a confirmed crime.',
  'Remove phone numbers, links, discount codes and invitations to pay outside Gwani.',
  'Remove reviews that are clearly about another vendor or from someone who never booked.',
  'Removing a review recalculates the vendor’s rating straight away.']

},
{
  id: 'catalogue',
  title: 'Products and portfolio',
  rules: [
  'Products must be legal to sell in Nigeria and described honestly. No replicas sold as originals.',
  'Portfolio photos must be the vendor’s own work. Photos from the internet or another vendor are removed.',
  'Prices must be the real price. “Call for price” or ₦1 placeholder prices are removed.']

},
{
  id: 'reports',
  title: 'Reports from users',
  rules: [
  'Check what was reported against these rules, not the number of reports.',
  'A vendor reporting a negative review is not a reason to remove it on its own.',
  'Note what you checked in the reason so the audit log explains the decision.']

},
{
  id: 'sanctions',
  title: 'Warnings, removals and suspension',
  rules: [
  'First breach: remove the content and warn the vendor with the rule they broke.',
  'Repeated breaches after a warning, or fraud: suspend. Suspension is soft: the profile stays visible as “temporarily unavailable” and existing jobs, orders and payouts carry on.',
  'Every removal tells the owner why and lets them appeal. Decide appeals with fresh eyes: a different moderator where possible.']

}];
