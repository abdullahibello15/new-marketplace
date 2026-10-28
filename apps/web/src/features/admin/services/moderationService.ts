import { ApiError, mockResponse } from '../../../services/mockApi';
import { vendors as seedVendors } from '../../../data/vendors';
import { getAllVendors, updateVendor } from '../../../services/vendorStore';
import { JOB_ACTOR } from '../../jobs/constants';
import { recordAccountMessage } from '../../jobs/services/notificationService';
import { endSessionsFor, findUserByVendorId } from '../../auth/services/authBackend';
import type { TFunction } from 'i18next';
import { findPublicReview, reviewStatsNow } from '../../public-profile/services/publicProfileService';
import { allFlaggedReviews, removeReview, restoreReview } from '../../public-profile/services/reviewModeration';
import { REPORT_REASON_LABELS } from '../../vendor-dashboard/constants';
import { reportedReviewsNow } from '../../vendor-dashboard/services/reviewService';
import { isVendorSuspended, suspendVendorByAdmin, vendorStanding } from '../../vendor-dashboard/services/subscriptionService';
import { ADMIN_PERMISSION } from '../config/roles';
import { MODERATION_KEYWORDS, PHONE_PATTERN } from '../config/policies';
import { AUDIT_ACTION, MODERATION_KIND, MODERATION_KIND_LABELS, MODERATION_SOURCE, MODERATION_STATUS, MODERATION_TAB, REMOVED_PHOTO_URL, VENDOR_STANDING_ROUTE } from '../constants';
import { mockAppealedItems, mockDecidedItems, mockModerationItems } from '../mock/moderation';
import { requirePermission } from './adminSession';
import { recordAudit } from './auditService';
import type { Product } from '../../../types/marketplace';
import type { AdminUser, ModerationItem, ModerationQueueItem, ModerationTab, PosterHistory, VendorWarning } from '../types';

/*
 * Content moderation (our backend, mocked). Items point at live content: removing one takes it off the
 * public pages (profile photo → placeholder, portfolio photo and product → taken down, review → hidden
 * and the vendor's rating recalculated) and tells the owner why, with an appeal. An upheld appeal keeps it
 * down; an overturned one puts back exactly what was removed. Every action is audited.
 */

let items: ModerationItem[] = [...structuredClone(mockModerationItems), ...structuredClone(mockDecidedItems)];
let warnings: VendorWarning[] = [{ id: 'warn-seed-1', vendorId: 'abdullahi-mechanic', reason: 'Using another vendor’s photos', at: new Date(Date.now() - 7 * 86_400_000).toISOString(), by: 'Ifeoma Obi' }];
let nextWarning = 2;

/* ---------- Content: what an item points at ---------- */

/** Keywords and phone numbers found in text (the mock automated flag). */
export function matchKeywords(text: string | null): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = MODERATION_KEYWORDS.filter((k) => lower.includes(k));
  return PHONE_PATTERN.test(text) ? [...found, 'phone number'] : found;
}

const vendorOf = (id: string) => getAllVendors().find((v) => v.id === id);

/** Fills in the item's content from the live data (reviews and products), keeping the last known copy once it's removed. */
function withContent(item: ModerationItem): ModerationItem {
  const c = item.content;
  if (item.kind === MODERATION_KIND.Review) {
    const flagged = allFlaggedReviews().find((r) => r.id === c.targetId);
    const live = flagged ?? findPublicReview(item.vendorId, c.targetId);
    if (!live) return item;
    const content = { ...c, text: live.comment || '(rated without a comment)', title: live.reviewerName, rating: live.rating };
    return { ...item, content, postedBy: { name: live.reviewerName, role: 'customer' }, flag: { ...item.flag, keywords: matchKeywords(live.comment) } };
  }
  if (item.kind === MODERATION_KIND.Product) {
    const product = vendorOf(item.vendorId)?.products.find((p) => p.id === c.targetId) ?? item.previous as Product | null;
    if (!product) return item;
    const text = product.description || null;
    return { ...item, content: { ...c, title: product.name, price: product.price, text, imageUrl: product.images[0] ?? c.imageUrl }, flag: { ...item.flag, keywords: matchKeywords(`${product.name} ${text ?? ''}`) } };
  }
  return item;
}

/** Reviews the demo vendor reported from their dashboard join the queue as user reports. */
function syncDashboardReports(): void {
  for (const r of reportedReviewsNow()) {
    const id = `mod-rep-${r.id}`;
    if (items.some((i) => i.id === id) || !r.report) continue;
    items = [
    {
      id,
      kind: MODERATION_KIND.Review,
      source: MODERATION_SOURCE.UserReport,
      status: MODERATION_STATUS.Pending,
      vendorId: 'bala-plumbing',
      vendorName: 'Bala Plumbing Services',
      postedBy: { name: r.customerName, role: 'customer' },
      content: { imageUrl: null, text: r.comment, title: r.customerName, price: null, rating: r.rating, targetId: r.id },
      flag: {
        reason: `${REPORT_REASON_LABELS[r.report.reason]}${r.report.details ? `: ${r.report.details}` : ''}`,
        reportedBy: 'Bala Plumbing Services (vendor)',
        reportCount: 1,
        keywords: matchKeywords(r.comment),
        duplicateOf: null
      },
      createdAt: r.report.reportedAt,
      decision: null,
      appeal: null,
      previous: null
    },
    ...items];

  }
}

/* ---------- Effects on public content ---------- */

/** Recalculates a vendor's average and count from their live reviews (after removing or restoring one). */
function recalculateRating(vendorId: string): void {
  const stats = reviewStatsNow(vendorId);
  updateVendor(vendorId, (v) => ({ ...v, rating: stats.average, reviews: stats.total }));
}

/** Takes the content down and returns what was there, so an overturned appeal can restore it. */
function takeDown(item: ModerationItem, reason: string): unknown {
  const { targetId } = item.content;
  switch (item.kind) {
    case MODERATION_KIND.Review:
      removeReview(targetId, reason);
      recalculateRating(item.vendorId);
      return null;
    case MODERATION_KIND.ProfilePhoto:{
        // A new upload that's turned down was never live: the vendor keeps their current photo.
        if (item.source === MODERATION_SOURCE.NewUpload) return null;
        const photo = vendorOf(item.vendorId)?.photo ?? null;
        if (photo === targetId) updateVendor(item.vendorId, (v) => ({ ...v, photo: REMOVED_PHOTO_URL }));
        return photo === targetId ? photo : null;
      }
    case MODERATION_KIND.PortfolioPhoto:{
        const gallery = vendorOf(item.vendorId)?.gallery ?? [];
        const index = gallery.indexOf(targetId);
        if (index >= 0) updateVendor(item.vendorId, (v) => ({ ...v, gallery: v.gallery.filter((_, i) => i !== index) }));
        return index >= 0 ? { index, url: targetId } : null;
      }
    case MODERATION_KIND.Product:{
        const product = vendorOf(item.vendorId)?.products.find((p) => p.id === targetId) ?? null;
        if (product) updateVendor(item.vendorId, (v) => ({ ...v, products: v.products.filter((p) => p.id !== targetId) }));
        return product;
      }
  }
}

/** Puts back exactly what takeDown removed. */
function putBack(item: ModerationItem): void {
  const prev = item.previous;
  switch (item.kind) {
    case MODERATION_KIND.Review:
      restoreReview(item.content.targetId);
      recalculateRating(item.vendorId);
      return;
    case MODERATION_KIND.ProfilePhoto:
      if (typeof prev === 'string') updateVendor(item.vendorId, (v) => ({ ...v, photo: prev }));
      return;
    case MODERATION_KIND.PortfolioPhoto:{
        const p = prev as {index: number;url: string;} | null;
        if (p) updateVendor(item.vendorId, (v) => ({ ...v, gallery: [...v.gallery.slice(0, p.index), p.url, ...v.gallery.slice(p.index)] }));
        return;
      }
    case MODERATION_KIND.Product:{
        const product = prev as Product | null;
        if (product) updateVendor(item.vendorId, (v) => v.products.some((p) => p.id === product.id) ? v : { ...v, products: [...v.products, product] });
      }
  }
}

/** What an item pointed at in the seed data: the "before" for content removed before the demo started. */
function seedPrevious(item: ModerationItem): unknown {
  const seed = seedVendors.find((v) => v.id === item.vendorId);
  const { targetId } = item.content;
  if (!seed) return null;
  if (item.kind === MODERATION_KIND.ProfilePhoto) return seed.photo === targetId ? targetId : null;
  if (item.kind === MODERATION_KIND.PortfolioPhoto) return seed.gallery.includes(targetId) ? { index: seed.gallery.indexOf(targetId), url: targetId } : null;
  if (item.kind === MODERATION_KIND.Product) return seed.products.find((p) => p.id === targetId) ?? null;
  return null;
}

/**
 * Appealed items in the mock were removed before the demo started: the vendor store already starts
 * without their content (data/moderationTakedowns.ts), so only the "before" is recorded here.
 */
for (const a of structuredClone(mockAppealedItems)) {
  const { removedHoursAgo, appealHoursAgo, appealMessage, removalReason, ...base } = a;
  const previous = seedPrevious(base);
  const at = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  items.push({
    ...base,
    status: MODERATION_STATUS.Removed,
    previous,
    decision: { action: 'removed', reason: removalReason, by: 'Ifeoma Obi', at: at(removedHoursAgo) },
    appeal: { message: appealMessage, at: at(appealHoursAgo), status: 'pending', decidedBy: null, decidedAt: null }
  });
}

/* ---------- Queue ---------- */

/** Which tab an item belongs to. User reports have their own tab whatever the content. */
export function tabOf(item: ModerationItem): ModerationTab {
  if (item.appeal?.status === 'pending') return MODERATION_TAB.Appeals;
  if (item.source === MODERATION_SOURCE.UserReport) return MODERATION_TAB.Reported;
  if (item.kind === MODERATION_KIND.ProfilePhoto) return MODERATION_TAB.Photos;
  if (item.kind === MODERATION_KIND.Review) return MODERATION_TAB.Reviews;
  return MODERATION_TAB.Catalogue;
}

const label = (item: ModerationItem) => `${MODERATION_KIND_LABELS[item.kind]} · ${item.vendorName}`;
const target = (item: ModerationItem) => ({ type: 'moderation_item' as const, id: item.id, label: label(item) });

/** GET /admin/moderation — every item with its live content and the poster's record, oldest first. */
export function listModerationItems(): Promise<ModerationQueueItem[]> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.ModerationReview);
    syncDashboardReports();
    return items.
    map((i) => ({ ...withContent(i), poster: posterHistory(i.vendorId) })).
    sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });
}

/** Sync read for analytics. */
export function moderationItemsNow(): ModerationItem[] {
  syncDashboardReports();
  return items;
}

/** The poster's record, shown beside each item. */
function posterHistory(vendorId: string): PosterHistory {
  const mine = items.filter((i) => i.vendorId === vendorId);
  return {
    removals: mine.filter((i) => i.status === MODERATION_STATUS.Removed).length,
    warnings: warnings.filter((w) => w.vendorId === vendorId).length,
    suspended: isVendorSuspended(vendorId),
    rating: vendorOf(vendorId)?.rating ?? null,
    inQueue: mine.filter((i) => i.status === MODERATION_STATUS.Pending).length
  };
}

function findItem(id: string): ModerationItem {
  const item = items.find((i) => i.id === id);
  if (!item) throw new ApiError('That item is no longer in the queue.', 404);
  return item;
}

function save(updated: ModerationItem): ModerationItem {
  items = items.map((i) => i.id === updated.id ? updated : i);
  return updated;
}

/** Tells the vendor, in their language (`key` is the wording under common:message). */
function notifyOwner(item: ModerationItem, key: string, values: (t: TFunction) => Record<string, unknown> = () => ({})) {
  recordAccountMessage(JOB_ACTOR.Vendor, item.vendorId, `common:message.${key}`, values, VENDOR_STANDING_ROUTE);
}

/** "profile photo", "product"…, in the recipient's language. */
const kindIn = (t: TFunction, item: ModerationItem) => t(`vendor:verification.kind.${item.kind}`, { defaultValue: MODERATION_KIND_LABELS[item.kind] }).toLowerCase();

/* ---------- Actions (single or bulk) ---------- */

function approveOne(admin: AdminUser, item: ModerationItem): void {
  if (item.status !== MODERATION_STATUS.Pending) throw new ApiError(`${label(item)} has already been decided.`, 409);
  // A new profile photo goes live when it's approved.
  if (item.kind === MODERATION_KIND.ProfilePhoto && item.source === MODERATION_SOURCE.NewUpload && item.content.imageUrl) {
    const url = item.content.imageUrl;
    updateVendor(item.vendorId, (v) => ({ ...v, photo: url }));
  }
  save({ ...item, status: MODERATION_STATUS.Approved, decision: { action: 'approved', reason: null, by: admin.name, at: new Date().toISOString() } });
  recordAudit(admin, AUDIT_ACTION.ModerationApprove, target(item));
}

function removeOne(admin: AdminUser, item: ModerationItem, reason: string): void {
  if (item.status !== MODERATION_STATUS.Pending) throw new ApiError(`${label(item)} has already been decided.`, 409);
  const resolved = withContent(item);
  const previous = takeDown(resolved, reason);
  save({ ...resolved, status: MODERATION_STATUS.Removed, previous, decision: { action: 'removed', reason, by: admin.name, at: new Date().toISOString() } });
  recordAudit(admin, AUDIT_ACTION.ModerationRemove, target(item), { reason });
  if (item.kind === MODERATION_KIND.Review) {
    notifyOwner(item, 'reviewRemoved', () => ({ reason }));
  } else {
    notifyOwner(item, 'contentRemoved', (t) => ({ kind: kindIn(t, item), reason }));
  }
}

/** POST /admin/moderation/approve { ids } */
export function approveItems(ids: string[]): Promise<number> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.ModerationReview);
    ids.forEach((id) => approveOne(admin, findItem(id)));
    return ids.length;
  }, 400);
}

/** POST /admin/moderation/remove { ids, reason } — the reason is sent to the owner. */
export function removeItems(ids: string[], reason: string): Promise<number> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.ModerationReview);
    const why = reason.trim();
    if (why.length < 3) throw new ApiError('Give a reason for removing it. The owner will see it.', 400);
    ids.forEach((id) => removeOne(admin, findItem(id), why));
    return ids.length;
  }, 500);
}

/** POST /admin/vendors/:id/warnings — a written warning (no content change). */
export function warnVendor(itemId: string, reason: string): Promise<void> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.ModerationReview);
    const item = findItem(itemId);
    const why = reason.trim();
    if (why.length < 3) throw new ApiError('Give a reason for the warning.', 400);
    warnings = [{ id: `warn-${nextWarning++}`, vendorId: item.vendorId, reason: why, at: new Date().toISOString(), by: admin.name }, ...warnings];
    notifyOwner(item, 'warning', () => ({ reason: why }));
    recordAudit(admin, AUDIT_ACTION.ModerationWarn, { type: 'vendor', id: item.vendorId, label: item.vendorName }, { reason: why, details: `From ${label(item)}` });
  }, 400);
}

/**
 * POST /admin/vendors/:id/suspension — the same soft suspension as a lapsed subscription (see
 * subscriptionService.vendorStanding): still listed but "temporarily unavailable", no new work. The owner's
 * sessions end at once, so every device has to sign in again and sees the suspension notice.
 */
export function suspendVendor(itemId: string, reason: string): Promise<void> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.ModerationSuspend);
    const item = findItem(itemId);
    const why = reason.trim();
    if (why.length < 3) throw new ApiError('Give a reason for the suspension.', 400);
    if (vendorStanding(item.vendorId).adminSuspension) throw new ApiError(`${item.vendorName} is already suspended.`, 409);
    suspendVendorByAdmin(item.vendorId, why);
    const owner = findUserByVendorId(item.vendorId);
    if (owner) endSessionsFor(owner.id, 'account_suspended');
    notifyOwner(item, 'suspended', () => ({ reason: why }));
    recordAudit(admin, AUDIT_ACTION.ModerationSuspend, { type: 'vendor', id: item.vendorId, label: item.vendorName }, { reason: why, details: `From ${label(item)}` });
  }, 500);
}

/** POST /admin/moderation/:id/appeal-decision — uphold keeps it removed; overturn restores it. */
export function decideAppeal(itemId: string, decision: 'uphold' | 'overturn', reason: string): Promise<void> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.ModerationReview);
    const item = findItem(itemId);
    if (item.appeal?.status !== 'pending') throw new ApiError('There’s no appeal waiting on this item.', 409);
    const why = reason.trim();
    if (why.length < 3) throw new ApiError('Give a reason for the appeal decision.', 400);
    const at = new Date().toISOString();
    if (decision === 'overturn') {
      putBack(item);
      save({ ...item, status: MODERATION_STATUS.Approved, appeal: { ...item.appeal, status: 'overturned', decidedBy: admin.name, decidedAt: at }, decision: { action: 'approved', reason: why, by: admin.name, at } });
      notifyOwner(item, 'appealAccepted', (t) => ({ kind: kindIn(t, item), reason: why }));
      recordAudit(admin, AUDIT_ACTION.ModerationAppealOverturned, target(item), { reason: why });
    } else {
      save({ ...item, appeal: { ...item.appeal, status: 'upheld', decidedBy: admin.name, decidedAt: at } });
      notifyOwner(item, 'appealDeclined', () => ({ reason: why }));
      recordAudit(admin, AUDIT_ACTION.ModerationAppealUpheld, target(item), { reason: why });
    }
  }, 400);
}

/* ---------- Vendor: their notices and appeals ---------- */

export interface VendorModerationNotices {
  removed: ModerationItem[];
  warnings: VendorWarning[];
  suspension: {reason: string;at: string;} | null;
}

/** GET /vendor/moderation — content of theirs that was removed (with appeal state), warnings and any suspension. */
export function getMyModerationNotices(vendorId: string): Promise<VendorModerationNotices> {
  return mockResponse(() => ({
    removed: items.
    filter((i) => i.vendorId === vendorId && i.kind !== MODERATION_KIND.Review && (i.status === MODERATION_STATUS.Removed || i.appeal)).
    map(withContent).
    sort((a, b) => (b.decision?.at ?? '').localeCompare(a.decision?.at ?? '')),
    warnings: warnings.filter((w) => w.vendorId === vendorId),
    suspension: vendorStanding(vendorId).adminSuspension
  }), 300);
}

/** POST /vendor/moderation/:id/appeal { message } — one appeal per removal. */
export function appealRemoval(vendorId: string, itemId: string, message: string): Promise<void> {
  return mockResponse(() => {
    const item = findItem(itemId);
    if (item.vendorId !== vendorId) throw new ApiError('That isn’t your content.', 403);
    if (item.status !== MODERATION_STATUS.Removed) throw new ApiError('Only removed content can be appealed.', 409);
    if (item.appeal) throw new ApiError('You’ve already appealed this removal.', 409);
    const text = message.trim();
    if (text.length < 10) throw new ApiError('Tell us why it should be put back (at least 10 characters).', 400);
    save({ ...item, appeal: { message: text, at: new Date().toISOString(), status: 'pending', decidedBy: null, decidedAt: null } });
  }, 500);
}
