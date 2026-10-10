import { addHours } from 'date-fns';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { getAllVendors } from '../../../services/vendorStore';
import { formatNaira } from '../../../utils/format';
import { DISPUTE_OUTCOME, DISPUTE_OUTCOME_LABELS, JOB_ACTOR, JOB_ROUTES } from '../../jobs/constants';
import { jobsSnapshot, resolveDispute } from '../../jobs/services/jobService';
import { recordAccountMessage } from '../../jobs/services/notificationService';
import type { TFunction } from 'i18next';
import { ORDER_ROUTES, VENDOR_ORDER_ROUTES } from '../../orders/constants';
import { ordersSnapshot, resolveOrderDispute } from '../../orders/services/orderService';
import { PAYMENT_STATUS } from '../../payments/constants';
import { escrowForPayment } from '../../payments/services/escrowService';
import { paymentsSnapshot } from '../../payments/services/paymentService';
import { DASHBOARD_ROUTES } from '../../vendor-dashboard/constants';
import { ADMIN_PERMISSION, roleCan } from '../config/roles';
import { ADMIN_POLICIES } from '../config/policies';
import { AUDIT_ACTION, DISPUTE_CASE_STATUS } from '../constants';
import { mockDisputeCases } from '../mock/disputes';
import { deadlineState } from '../utils/format';
import { requirePermission } from './adminSession';
import { recordAudit } from './auditService';
import type { DisputeOutcome, Job, JobParty } from '../../jobs/types';
import type { Order } from '../../orders/types';
import type { Escrow, Payment } from '../../payments/types';
import type { AdminUser, DisputeCase, DisputeSummary, PartyHistory } from '../types';

/*
 * Gwani's dispute workspace (our backend, mocked). A case wraps a disputed job or order: the mediator's
 * messages, evidence requests and internal notes live here; the job or order itself is read-only history.
 * Resolving goes through the job or order service, so the state machine, escrow ledger and notifications
 * all follow. Every action is audited.
 */
let cases: DisputeCase[] = structuredClone(mockDisputeCases);
let nextId = 1;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${nextId++}`;

export interface DisputeDetail {
  summary: DisputeSummary;
  dispute: DisputeCase;
  job: Job | null;
  order: Order | null;
  payment: Payment | null;
  escrow: Escrow | null;
  parties: Record<JobParty, PartyHistory>;
}

type Subject = {kind: 'job';job: Job;} | {kind: 'order';order: Order;};

function subjectOf(c: DisputeCase, jobs: readonly Job[], orders: readonly Order[]): Subject | null {
  if (c.subject.kind === 'job') {
    const job = jobs.find((j) => j.id === c.subject.id);
    return job ? { kind: 'job', job } : null;
  }
  const order = orders.find((o) => o.id === c.subject.id);
  return order ? { kind: 'order', order } : null;
}

const disputeOf = (s: Subject) => s.kind === 'job' ? s.job.dispute : s.order.dispute;

/** The payment that paid for it (a paid or refunded one wins over abandoned attempts). */
function paymentFor(c: DisputeCase): Payment | null {
  const all = paymentsSnapshot().filter((p) => p.subject.kind === c.subject.kind && p.subject.id === c.subject.id);
  return all.find((p) => p.status === PAYMENT_STATUS.Paid || p.status === PAYMENT_STATUS.Refunded) ?? all[0] ?? null;
}

function summarise(c: DisputeCase, s: Subject, now = new Date()): DisputeSummary {
  const dispute = disputeOf(s);
  const resolved = !!dispute?.resolution;
  const mediating = !!c.assignee || c.messages.some((m) => m.from === 'mediator');
  const payment = paymentFor(c);
  const base = s.kind === 'job' ?
  { title: `Job #${s.job.id}${s.job.serviceName ? ` · ${s.job.serviceName}` : ''}`, customerName: s.job.customerName, vendorId: s.job.vendorId, vendorName: s.job.vendorName, price: s.job.agreedPrice ?? 0 } :
  { title: `Order #${s.order.id}`, customerName: s.order.customerName, vendorId: s.order.vendorId, vendorName: s.order.vendorName, price: s.order.total };
  return {
    id: c.id,
    subject: c.subject,
    status: resolved ? DISPUTE_CASE_STATUS.Resolved : mediating ? DISPUTE_CASE_STATUS.InMediation : DISPUTE_CASE_STATUS.Open,
    title: base.title,
    customerName: base.customerName,
    vendorId: base.vendorId,
    vendorName: base.vendorName,
    reason: dispute?.reason ?? 'other',
    openedAt: dispute?.at ?? now.toISOString(),
    amount: payment?.amount ?? base.price,
    assignee: c.assignee,
    deadlines: c.deadlines,
    overdue: !resolved && Object.values(c.deadlines).some((d) => deadlineState(d, now).state === 'overdue'),
    outcome: dispute?.resolution?.outcome ?? null
  };
}

function load(id: string) {
  const c = cases.find((x) => x.id === id);
  if (!c) throw new ApiError('We couldn’t find that dispute.', 404);
  const s = subjectOf(c, jobsSnapshot(), ordersSnapshot());
  if (!s) throw new ApiError('The job or order for this dispute is missing.', 404);
  return { c, s };
}

function save(updated: DisputeCase): DisputeCase {
  cases = cases.map((c) => c.id === updated.id ? updated : c);
  return updated;
}

/** Each party's record, for the mediator: other disputes, cancellations, rating. */
function partyHistory(c: DisputeCase, s: Subject): Record<JobParty, PartyHistory> {
  const jobs = jobsSnapshot();
  const orders = ordersSnapshot();
  const customerId = s.kind === 'job' ? s.job.customerId : s.order.customerId;
  const vendorId = s.kind === 'job' ? s.job.vendorId : s.order.vendorId;
  const others = cases.filter((x) => x.id !== c.id).map((x) => subjectOf(x, jobs, orders)).filter((x): x is Subject => x !== null);
  const vendor = getAllVendors().find((v) => v.id === vendorId);
  return {
    customer: {
      name: s.kind === 'job' ? s.job.customerName : s.order.customerName,
      pastDisputes: others.filter((o) => (o.kind === 'job' ? o.job.customerId : o.order.customerId) === customerId).length,
      cancellations:
      jobs.filter((j) => j.customerId === customerId && j.cancellation?.by === JOB_ACTOR.Customer).length +
      orders.filter((o) => o.customerId === customerId && o.history.some((h) => h.status === 'cancelled' && h.by === 'customer')).length,
      rating: null,
      jobs: jobs.filter((j) => j.customerId === customerId).length,
      orders: orders.filter((o) => o.customerId === customerId).length
    },
    vendor: {
      name: s.kind === 'job' ? s.job.vendorName : s.order.vendorName,
      pastDisputes: others.filter((o) => (o.kind === 'job' ? o.job.vendorId : o.order.vendorId) === vendorId).length,
      cancellations: vendor?.cancellationCount ?? 0,
      rating: vendor ? { average: vendor.rating, count: vendor.reviews } : null,
      jobs: jobs.filter((j) => j.vendorId === vendorId).length,
      orders: orders.filter((o) => o.vendorId === vendorId).length
    }
  };
}

const target = (summary: DisputeSummary) => ({ type: 'dispute' as const, id: summary.id, label: summary.title });

/** Where each party opens the job or order from a notification. */
function linkFor(c: DisputeCase, party: JobParty): string {
  if (c.subject.kind === 'job') return party === 'customer' ? JOB_ROUTES.job(c.subject.id) : DASHBOARD_ROUTES.request(c.subject.id);
  return party === 'customer' ? ORDER_ROUTES.order(c.subject.id) : VENDOR_ORDER_ROUTES.order(c.subject.id);
}

/** Tells one or both parties, each in their own language (`key` is the wording under common:message). */
function notify(c: DisputeCase, s: Subject, to: 'customer' | 'vendor' | 'both', key: string, values: (t: TFunction) => Record<string, unknown>) {
  const ids: Record<JobParty, string> = s.kind === 'job' ? { customer: s.job.customerId, vendor: s.job.vendorId } : { customer: s.order.customerId, vendor: s.order.vendorId };
  const parties: JobParty[] = to === 'both' ? ['customer', 'vendor'] : [to];
  for (const p of parties) recordAccountMessage(p, ids[p], `common:message.${key}`, values, linkFor(c, p));
}

/** Mediation actions need the case to be yours: unassigned cases are assigned to you on your first action. */
function takeIfFree(c: DisputeCase, admin: AdminUser): DisputeCase {
  if (c.assignee && c.assignee.adminId !== admin.id && !roleCan(admin.role, ADMIN_PERMISSION.OverrideClaim)) {
    throw new ApiError(`${c.assignee.adminName} is handling this dispute.`, 409);
  }
  if (c.assignee?.adminId === admin.id) return c;
  const now = new Date();
  return { ...c, assignee: { adminId: admin.id, adminName: admin.name, at: now.toISOString(), expiresAt: addHours(now, 24 * 365).toISOString() } };
}

function assertOpen(s: Subject) {
  if (disputeOf(s)?.resolution) throw new ApiError('This dispute is already resolved.', 409);
}

/* ---------- Reads ---------- */

/** GET /admin/disputes */
export function listDisputes(): Promise<DisputeSummary[]> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.DisputeMediate);
    const jobs = jobsSnapshot();
    const orders = ordersSnapshot();
    return cases.flatMap((c) => {
      const s = subjectOf(c, jobs, orders);
      return s ? [summarise(c, s)] : [];
    });
  });
}

/** GET /admin/disputes/:id — the case, the full job or order (read-only), money, and both parties' records. */
export function getDispute(id: string): Promise<DisputeDetail> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.DisputeMediate);
    const { c, s } = load(id);
    const payment = paymentFor(c);
    return {
      summary: summarise(c, s),
      dispute: c,
      job: s.kind === 'job' ? s.job : null,
      order: s.kind === 'order' ? s.order : null,
      payment,
      escrow: payment ? escrowForPayment(payment.reference) : null,
      parties: partyHistory(c, s)
    };
  }, 350);
}

/** Sync read for analytics. */
export function disputeSummariesNow(): DisputeSummary[] {
  const jobs = jobsSnapshot();
  const orders = ordersSnapshot();
  return cases.flatMap((c) => {
    const s = subjectOf(c, jobs, orders);
    return s ? [summarise(c, s)] : [];
  });
}

/* ---------- Mediation ---------- */

/** POST /admin/disputes/:id/assign — take the case on. */
export function takeDispute(id: string): Promise<void> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.DisputeMediate);
    const { c, s } = load(id);
    assertOpen(s);
    const taken = save(takeIfFree(c, admin));
    recordAudit(admin, AUDIT_ACTION.DisputeClaim, target(summarise(taken, s)));
  }, 300);
}

/** POST /admin/disputes/:id/messages — to the customer, the vendor or both. They're notified. */
export function messageParties(id: string, to: 'customer' | 'vendor' | 'both', body: string): Promise<void> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.DisputeMediate);
    const text = body.trim();
    if (text.length < 2) throw new ApiError('Write a message first.', 400);
    const { c, s } = load(id);
    assertOpen(s);
    const mine = takeIfFree(c, admin);
    save({ ...mine, messages: [...mine.messages, { id: uid('msg'), from: 'mediator', to, authorName: admin.name, body: text, at: new Date().toISOString(), kind: 'message' }] });
    notify(c, s, to, 'disputeMessage', () => ({ text }));
    recordAudit(admin, AUDIT_ACTION.DisputeMessage, target(summarise(mine, s)), { details: `To: ${to}` });
  }, 400);
}

/** POST /admin/disputes/:id/evidence-requests — asks one party for evidence and starts their response countdown. */
export function requestEvidence(id: string, party: JobParty, message: string): Promise<void> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.DisputeMediate);
    const text = message.trim();
    if (text.length < 10) throw new ApiError('Say what evidence you need (at least 10 characters).', 400);
    const { c, s } = load(id);
    assertOpen(s);
    const mine = takeIfFree(c, admin);
    const now = new Date();
    save({
      ...mine,
      messages: [...mine.messages, { id: uid('msg'), from: 'mediator', to: party, authorName: admin.name, body: text, at: now.toISOString(), kind: 'evidence_request' }],
      deadlines: { ...mine.deadlines, [party]: { requestedAt: now.toISOString(), dueAt: addHours(now, ADMIN_POLICIES.disputeResponseHours).toISOString(), respondedAt: null } }
    });
    notify(c, s, party, 'disputeEvidence', () => ({ text, hours: ADMIN_POLICIES.disputeResponseHours }));
    recordAudit(admin, AUDIT_ACTION.DisputeRequestEvidence, target(summarise(mine, s)), { reason: text, details: `From: ${party}` });
  }, 400);
}

/** POST /admin/disputes/:id/notes — staff only, never shown to either party. */
export function addInternalNote(id: string, body: string): Promise<void> {
  return mockResponse(() => {
    const admin = requirePermission(ADMIN_PERMISSION.DisputeMediate);
    const text = body.trim();
    if (text.length < 2) throw new ApiError('Write a note first.', 400);
    const { c, s } = load(id);
    const mine = takeIfFree(c, admin);
    save({ ...mine, notes: [...mine.notes, { id: uid('note'), authorName: admin.name, body: text, at: new Date().toISOString() }] });
    recordAudit(admin, AUDIT_ACTION.DisputeNote, target(summarise(mine, s)));
  }, 300);
}

/**
 * POST /admin/disputes/:id/resolution — release to the vendor, refund in full, refund part, or dismiss.
 * Needs a written reason, which both parties see. The job or order service moves the status and the
 * escrow ledger follows; both parties are notified.
 */
export async function resolveDisputeCase(id: string, outcome: DisputeOutcome, input: {reason: string;refundAmount?: number;}): Promise<void> {
  const admin = requirePermission(ADMIN_PERMISSION.DisputeResolve);
  const reason = input.reason.trim();
  if (reason.length < 10) throw new ApiError('Write the reason for your decision (at least 10 characters). Both parties will see it.', 400);
  const { c, s } = load(id);
  assertOpen(s);
  const mine = save(takeIfFree(c, admin));
  const refund = input.refundAmount ?? 0;
  if (s.kind === 'job') await resolveDispute(s.job.id, outcome, refund, reason);else
  await resolveOrderDispute(s.order.id, outcome, refund, reason);

  const after = load(id);
  const resolution = disputeOf(after.s)?.resolution;
  const money = resolution?.refundAmount ? `Refund ${formatNaira(resolution.refundAmount)}` : outcome === DISPUTE_OUTCOME.Dismiss ? 'Held again' : 'Released to vendor';
  recordAudit(admin, AUDIT_ACTION.DisputeResolve, target(summarise(mine, after.s)), { reason, details: `${DISPUTE_OUTCOME_LABELS[outcome]} · ${money}` });
  notify(mine, after.s, 'both', resolution?.refundAmount ? 'disputeDecisionRefund' : 'disputeDecision', (t) => ({
    outcome: t(`jobs:disputeOutcome.${outcome}`, { defaultValue: DISPUTE_OUTCOME_LABELS[outcome] }),
    reason,
    amount: resolution?.refundAmount ? formatNaira(resolution.refundAmount) : ''
  }));
}
