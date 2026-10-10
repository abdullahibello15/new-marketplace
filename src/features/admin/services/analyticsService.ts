import { differenceInHours, format, subDays } from 'date-fns';
import { ApiError, mockResponse } from '../../../services/mockApi';
import { AUDIT_ACTION_LABELS, DISPUTE_CASE_STATUS, MODERATION_STATUS, MODERATION_TAB, OUTREACH_ACTIONS, VERIFICATION_STATUS } from '../constants';
import { requirePermission } from './adminSession';
import { auditSnapshot } from './auditService';
import { disputeSummariesNow } from './disputeService';
import { moderationItemsNow, tabOf } from './moderationService';
import { applicationsSnapshot } from './verificationService';
import { nigerLgas } from '../../../data/nigerLgas';
import { findTradeCategory, tradeCategories } from '../../../data/tradeCategories';
import { verificationTiers } from '../../../data/verificationTiers';
import { ratingsTimelineNow } from '../../public-profile/services/publicProfileService';
import { allAssociations } from '../../vendor-dashboard/services/associationService';
import { SUBSCRIPTION_STATUS } from '../../vendor-dashboard/constants';
import { ADMIN_PERMISSION } from '../config/roles';
import { ACTIVE_VENDOR_RULE, AT_RISK_DAYS, CHURN, CHURN_REASON_LABELS, GMV_DEFINITION, RATE_DEFINITIONS, TOP_VENDORS, type ChurnReasonId } from '../analytics/config';
import { SLA_RULES, SLA_SETTINGS, type SlaType } from '../analytics/slaConfig';
import { evaluateAll, slaStats, type SlaVerdict } from '../analytics/sla';
import {
  activityTrend,
  averageLifetimeMonths,
  churnBreakdown,
  churnEvents,
  churnSeries,
  churnSummary,
  cohortRetention,
  ratingTrend,
  winBacks,
  type ChurnContext,
  type ChurnType } from
'../analytics/churn';
import {
  REVENUE_LINES,
  activeByCategory,
  activeByLga,
  activeSubscriberCount,
  activeVendorIds,
  bucketSizeFor,
  bucketsFor,
  categoryLgaMatrix,
  changePct,
  churn,
  commissionIn,
  comparable,
  coverByVendor,
  currentCover,
  expiringWithin,
  funnel,
  gmvBy,
  gmvSeries,
  gmvSummary,
  isSubscribed,
  mrrAt,
  planChanges,
  planMix,
  previousRange,
  projectNextMonth,
  renewalRate,
  resolveRange,
  revenueByLine,
  revenueIn,
  revenueSeries,
  statusAt,
  subscriberMovements,
  subscribersAt,
  vendorSummary,
  workRates,
  within,
  type RevenueLine } from
'../analytics/aggregations';
import { collectFacts, scheduleFor } from './analyticsFacts';
import type { NigerLga, TradeCategory, Verification } from '../../../types/marketplace';
import type { SubscriptionStatus } from '../../vendor-dashboard/types';
import type { AnalyticsFacts, AnalyticsQuery, BucketSize, BusinessKind, Comparable, CoverageFact, DateRange, PlanLine, SlaFilters, SubscriberStatus, VendorFact } from '../analytics/types';
import type { AuditAction, DisputeCaseStatus, ModerationTab, VerificationStatus } from '../types';

export interface AdminAnalytics {
  verification: {byStatus: Record<VerificationStatus, number>;medianHoursToDecision: number | null;};
  disputes: {byStatus: Record<DisputeCaseStatus, number>;overdue: number;atStake: number;refunded: number;};
  moderation: {pendingByTab: Record<ModerationTab, number>;removedLast7Days: number;approvedLast7Days: number;};
  /** Admin actions in the last 7 days, per person (from the audit log). */
  actionsByAdmin: {name: string;role: string;count: number;}[];
}

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/** GET /admin/analytics/queues — read-only figures from the admin queues and the audit log. */
export function getAdminAnalytics(now = new Date()): Promise<AdminAnalytics> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.ViewAnalytics);
    const apps = applicationsSnapshot();
    const disputes = disputeSummariesNow();
    const items = moderationItemsNow();
    const weekAgo = subDays(now, 7);
    const recent = auditSnapshot().filter((e) => new Date(e.at) >= weekAgo);

    const count = <K extends string,>(keys: readonly K[], of: (k: K) => number) => Object.fromEntries(keys.map((k) => [k, of(k)])) as Record<K, number>;
    const byActor = new Map<string, {name: string;role: string;count: number;}>();
    for (const e of recent) {
      const row = byActor.get(e.actor.id) ?? { name: e.actor.name, role: e.actor.role, count: 0 };
      byActor.set(e.actor.id, { ...row, count: row.count + 1 });
    }

    return {
      verification: {
        byStatus: count(Object.values(VERIFICATION_STATUS), (s) => apps.filter((a) => a.status === s).length),
        medianHoursToDecision: median(apps.flatMap((a) => a.decision && a.decision.outcome !== 'more_info' ? [differenceInHours(new Date(a.decision.at), new Date(a.submittedAt))] : []))
      },
      disputes: {
        byStatus: count(Object.values(DISPUTE_CASE_STATUS), (s) => disputes.filter((d) => d.status === s).length),
        overdue: disputes.filter((d) => d.overdue).length,
        atStake: disputes.filter((d) => d.status !== DISPUTE_CASE_STATUS.Resolved).reduce((s, d) => s + d.amount, 0),
        refunded: disputes.filter((d) => d.outcome === 'refund' || d.outcome === 'split').length
      },
      moderation: {
        pendingByTab: count(Object.values(MODERATION_TAB), (t) =>
        items.filter((i) => tabOf(i) === t && (t === MODERATION_TAB.Appeals ? i.appeal?.status === 'pending' : i.status === MODERATION_STATUS.Pending)).length
        ),
        removedLast7Days: recent.filter((e) => e.action === 'moderation.remove').length,
        approvedLast7Days: recent.filter((e) => e.action === 'moderation.approve').length
      },
      actionsByAdmin: [...byActor.values()].sort((a, b) => b.count - a.count)
    };
  });
}

/* ================= Platform analytics: vendors, GMV, subscription revenue ================= */

const LATENCY = 600;

export interface AnalyticsPeriod {
  range: {start: string;end: string;};
  previous: {start: string;end: string;};
  bucketSize: BucketSize;
  generatedAt: string;
}

function period(q: Pick<AnalyticsQuery, 'preset' | 'from' | 'to'>, now: Date) {
  const range = resolveRange(q.preset, q.from, q.to, now);
  const previous = previousRange(range);
  return { range, previous, buckets: bucketsFor(range), previousBuckets: bucketsFor(previous, bucketSizeFor(range)) };
}

const iso = (r: DateRange) => ({ start: r.start.toISOString(), end: r.end.toISOString() });
const categoryLabel = (id: string) => findTradeCategory(id)?.label ?? id;

/* ---------- Task 103: active vendors ---------- */

export interface VendorAnalytics extends AnalyticsPeriod {
  kind: BusinessKind;
  definition: string;
  summary: {active: Comparable;newVendors: Comparable;suspended: Comparable;verifiedShare: Comparable;};
  byCategory: {category: TradeCategory;label: string;count: number;previous: number;}[];
  byLga: {lga: NigerLga;count: number;previous: number;change: number | null;}[];
  matrix: {categories: {id: TradeCategory;label: string;}[];lgas: NigerLga[];rows: {category: TradeCategory;cells: {lga: NigerLga;count: number;}[];}[];};
}

/** GET /admin/analytics/vendors?range&kind — active vendors by category and LGA (service or retail). */
export function getVendorAnalytics(q: AnalyticsQuery): Promise<VendorAnalytics> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.ViewAnalytics);
    const now = new Date();
    const facts = collectFacts();
    const { range, previous, buckets } = period(q, now);
    const vendors = facts.vendors.filter((v) => v.kind === q.kind);
    const work = facts.work.filter((w) => w.kind === q.kind);
    const cover = coverByVendor(facts.coverage);
    const active = activeVendorIds(vendors, work, cover, range, facts.suspendedByAdmin, now);
    const activePrev = activeVendorIds(vendors, work, cover, previous, facts.suspendedByAdmin, now);
    const s = vendorSummary(vendors, active, cover, range, facts.suspendedByAdmin, now);
    const p = vendorSummary(vendors, activePrev, cover, previous, facts.suspendedByAdmin, now);
    const categories = tradeCategories.filter((c) => (c.kind === 'retail' ? 'retail' : 'service') === q.kind).map((c) => c.id);
    const prevByCategory = new Map(activeByCategory(vendors, activePrev, categories).map((r) => [r.category, r.count]));
    const prevByLga = new Map(activeByLga(vendors, activePrev, nigerLgas).map((r) => [r.lga, r.count]));

    return {
      range: iso(range),
      previous: iso(previous),
      bucketSize: buckets.length ? bucketSizeFor(range) : 'day',
      generatedAt: facts.generatedAt,
      kind: q.kind,
      definition: ACTIVE_VENDOR_RULE.description,
      summary: {
        active: comparable(s.active, p.active),
        newVendors: comparable(s.newVendors, p.newVendors),
        suspended: comparable(s.suspended, p.suspended),
        verifiedShare: comparable(s.verifiedShare, p.verifiedShare)
      },
      byCategory: activeByCategory(vendors, active, categories).map((r) => ({ ...r, label: categoryLabel(r.category), previous: prevByCategory.get(r.category) ?? 0 })),
      byLga: activeByLga(vendors, active, nigerLgas).map((r) => {
        const prev = prevByLga.get(r.lga) ?? 0;
        return { ...r, previous: prev, change: changePct(r.count, prev) };
      }),
      matrix: {
        categories: categories.map((id) => ({ id, label: categoryLabel(id) })),
        lgas: [...nigerLgas],
        rows: categoryLgaMatrix(vendors, active, categories, nigerLgas)
      }
    };
  }, LATENCY);
}

/* ---------- Task 104: GMV-equivalent ---------- */

export interface GmvAnalytics extends AnalyticsPeriod {
  definition: string;
  rateDefinitions: typeof RATE_DEFINITIONS;
  summary: {gmv: Comparable;completed: Comparable;jobs: Comparable;orders: Comparable;average: Comparable;};
  series: {key: string;label: string;service: number;retail: number;total: number;previousTotal: number | null;}[];
  byCategory: {key: string;label: string;gmv: number;count: number;}[];
  byLga: {key: string;gmv: number;count: number;}[];
  topVendors: {vendorId: string;name: string;gmv: number;count: number;}[];
  funnel: {current: ReturnType<typeof funnel>;previous: ReturnType<typeof funnel>;};
  rates: {current: ReturnType<typeof workRates>;previous: ReturnType<typeof workRates>;};
}

/** GET /admin/analytics/gmv?range — completed work value, how it was paid, and the service funnel. */
export function getGmvAnalytics(q: AnalyticsQuery): Promise<GmvAnalytics> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.ViewAnalytics);
    const now = new Date();
    const facts = collectFacts();
    const { range, previous, buckets, previousBuckets } = period(q, now);
    const s = gmvSummary(facts.work, range);
    const p = gmvSummary(facts.work, previous);
    const prevSeries = gmvSeries(facts.work, previousBuckets);
    const names = new Map(facts.vendors.map((v) => [v.id, v.name]));

    return {
      range: iso(range),
      previous: iso(previous),
      bucketSize: bucketSizeFor(range),
      generatedAt: facts.generatedAt,
      definition: GMV_DEFINITION,
      rateDefinitions: RATE_DEFINITIONS,
      summary: {
        gmv: comparable(s.gmv, p.gmv),
        completed: comparable(s.jobs + s.orders, p.jobs + p.orders),
        jobs: comparable(s.jobs, p.jobs),
        orders: comparable(s.orders, p.orders),
        average: comparable(s.average, p.average)
      },
      series: gmvSeries(facts.work, buckets).map((b, i) => ({ ...b, previousTotal: prevSeries[i]?.total ?? null })),
      byCategory: gmvBy(facts.work, range, (w) => w.category).map((r) => ({ ...r, label: categoryLabel(r.key) })),
      byLga: gmvBy(facts.work, range, (w) => w.lga),
      topVendors: gmvBy(facts.work, range, (w) => w.vendorId).
      slice(0, TOP_VENDORS).
      map((r) => ({ vendorId: r.key, name: names.get(r.key) ?? r.key, gmv: r.gmv, count: r.count })),
      funnel: { current: funnel(facts.work, range), previous: funnel(facts.work, previous) },
      rates: { current: workRates(facts.work, range), previous: workRates(facts.work, previous) }
    };
  }, LATENCY);
}

/* ---------- Task 105: subscription revenue ---------- */

export interface SubscriptionAnalytics extends AnalyticsPeriod {
  definitions: typeof RATE_DEFINITIONS;
  summary: {mrr: Comparable;revenue: Comparable;subscribers: Comparable;churnRate: Comparable;arpu: Comparable;};
  series: ({key: string;label: string;} & Record<RevenueLine, number>)[];
  byLine: {line: RevenueLine;label: string;revenue: number;previous: number;}[];
  planMix: {line: RevenueLine;label: string;count: number;}[];
  planChanges: {current: {upgrades: number;downgrades: number;};previous: {upgrades: number;downgrades: number;};};
  movements: {current: ReturnType<typeof subscriberMovements>;previous: ReturnType<typeof subscriberMovements>;};
  statuses: {status: SubscriptionStatus;count: number;}[];
  atRisk: {days: number;total: number;vendors: {vendorId: string;name: string;endsOn: string;monthlyValue: number;status: SubscriberStatus;viaBundle: boolean;}[];};
  renewal: {current: ReturnType<typeof renewalRate>;previous: ReturnType<typeof renewalRate>;};
  projection: {estimate: number;basedOnMrr: number;basedOnRenewalRate: number | null;};
  commission: Comparable;
}

export const REVENUE_LINE_LABELS: Record<RevenueLine, string> = {
  starter: 'Starter',
  standard: 'Standard',
  premium: 'Premium',
  bundle: 'Association bundles'
};

/** GET /admin/analytics/subscriptions?range — subscription revenue, subscribers and renewals; escrow commission separately. */
export function getSubscriptionAnalytics(q: AnalyticsQuery): Promise<SubscriptionAnalytics> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.ViewAnalytics);
    const now = new Date();
    const facts = collectFacts();
    const { range, previous, buckets } = period(q, now);
    const cover = coverByVendor(facts.coverage);
    const admin = facts.suspendedByAdmin;
    const vendors = new Map(facts.vendors.map((v) => [v.id, v]));
    /** Closed accounts aren't "suspended subscribers"; they've left. */
    const stillHere = (vendorId: string, at: Date) => {
      const v = vendors.get(vendorId);
      return !v?.leftAt || new Date(v.leftAt) > at;
    };

    const mrr = mrrAt(cover, range.end, admin, now);
    const mrrPrev = mrrAt(cover, previous.end, admin, now);
    const revenue = revenueIn(facts.revenue, range);
    const revenuePrev = revenueIn(facts.revenue, previous);
    const subscribers = activeSubscriberCount(cover, range.end, admin, now);
    const subscribersPrev = activeSubscriberCount(cover, previous.end, admin, now);
    const churnNow = churn(cover, range, admin, now);
    const churnPrev = churn(cover, previous, admin, now);
    const byLine = revenueByLine(facts.revenue, range);
    const byLinePrev = revenueByLine(facts.revenue, previous);
    const mix = planMix(cover, range.end, admin, now);
    const renewal = renewalRate(cover, range, now);
    const risk = expiringWithin(cover, range.end, AT_RISK_DAYS, admin, now).filter((r) => stillHere(r.vendorId, range.end));
    const statusCounts = subscribersAt(cover, range.end, admin, now).filter((s) => s.status !== 'none' && stillHere(s.vendorId, range.end));
    const arpu = (rev: number, subs: number) => subs ? Math.round(rev / subs) : 0;

    return {
      range: iso(range),
      previous: iso(previous),
      bucketSize: bucketSizeFor(range),
      generatedAt: facts.generatedAt,
      definitions: RATE_DEFINITIONS,
      summary: {
        mrr: comparable(mrr, mrrPrev),
        revenue: comparable(revenue, revenuePrev),
        subscribers: comparable(subscribers, subscribersPrev),
        churnRate: comparable(churnNow.rate, churnPrev.rate),
        arpu: comparable(arpu(revenue, subscribers), arpu(revenuePrev, subscribersPrev))
      },
      series: revenueSeries(facts.revenue, buckets),
      byLine: REVENUE_LINES.map((line) => ({ line, label: REVENUE_LINE_LABELS[line], revenue: byLine[line], previous: byLinePrev[line] })),
      planMix: REVENUE_LINES.map((line) => ({ line, label: REVENUE_LINE_LABELS[line], count: mix[line] })),
      planChanges: { current: planChanges(facts.revenue, range), previous: planChanges(facts.revenue, previous) },
      movements: { current: subscriberMovements(cover, range, now), previous: subscriberMovements(cover, previous, now) },
      statuses: Object.values(SUBSCRIPTION_STATUS).map((status) => ({ status, count: statusCounts.filter((s) => s.status === status).length })),
      atRisk: {
        days: AT_RISK_DAYS,
        total: risk.reduce((sum, r) => sum + r.monthlyValue, 0),
        vendors: risk.map((r) => ({ ...r, name: vendors.get(r.vendorId)?.name ?? r.vendorId }))
      },
      renewal: { current: renewal, previous: renewalRate(cover, previous, now) },
      projection: { estimate: projectNextMonth(mrr, renewal.rate), basedOnMrr: mrr, basedOnRenewalRate: renewal.rate },
      commission: comparable(commissionIn(facts.commission, range), commissionIn(facts.commission, previous))
    };
  }, LATENCY);
}

/* ---------- Plans, tiers and associations (shared by SLA and churn) ---------- */

export const PLAN_LINE_LABELS: Record<PlanLine, string> = { ...REVENUE_LINE_LABELS, bundle: 'Association bundle', none: 'No plan' };

/** The vendor's plan at a moment: their own plan, an association bundle, or none. */
function planAt(cover: Map<string, CoverageFact[]>, vendorId: string, at: Date): PlanLine {
  const own = cover.get(vendorId) ?? [];
  const c = currentCover(own, at);
  if (!c || !isSubscribed(statusAt(own, at))) return 'none';
  return c.viaBundle ? 'bundle' : c.planId;
}

const tierLabel = (tier: Verification) => verificationTiers.find((t) => t.id === tier)?.label ?? tier;
const primaryLga = (v: VendorFact): NigerLga => v.serviceAreas[0] ?? 'Chanchaga';

/** Vendor → the Trade Association bundle they're in (members not removed). */
function associationOf(): Map<string, string> {
  return new Map(allAssociations().flatMap((a) => a.members.filter((m) => m.status !== 'removed' && m.vendorId).map((m) => [m.vendorId as string, a.name] as const)));
}

export interface OutreachMark {
  action: AuditAction;
  label: string;
  at: string;
  by: string;
}

/** Outreach already done for each vendor (from the audit log), newest first. */
function outreachMarks(): Map<string, OutreachMark[]> {
  const map = new Map<string, OutreachMark[]>();
  for (const e of auditSnapshot()) {
    if (e.target.type !== 'vendor' || !OUTREACH_ACTIONS.includes(e.action)) continue;
    map.set(e.target.id, [...map.get(e.target.id) ?? [], { action: e.action, label: AUDIT_ACTION_LABELS[e.action], at: e.at, by: e.actor.name }]);
  }
  for (const list of map.values()) list.sort((a, b) => b.at.localeCompare(a.at));
  return map;
}

/* ---------- Task 106: response-time SLAs ---------- */

export interface SlaRuleInfo {
  type: SlaType;
  label: string;
  description: string;
  withinHoursMinutes: number;
  afterHoursWallClockMinutes: number;
}

export interface SlaVendorRow {
  vendorId: string;
  name: string;
  current: boolean;
  category: TradeCategory;
  categoryLabel: string;
  lga: NigerLga;
  plan: PlanLine;
  planLabel: string;
  responses: number;
  compliance: number | null;
  previousCompliance: number | null;
  /** Compliance change in percentage points vs the previous period. */
  trend: number | null;
  averageMinutes: number | null;
  medianMinutes: number | null;
  breaches: number;
  lastBreachAt: string | null;
  outreach: OutreachMark[];
}

export interface SlaGroupRow {
  key: string;
  label: string;
  median: number | null;
  p90: number | null;
  compliance: number | null;
  count: number;
}

export interface SlaAnalytics extends AnalyticsPeriod {
  rules: SlaRuleInfo[];
  repeatBreachThreshold: number;
  filters: SlaFilters;
  summary: {compliance: Comparable;median: Comparable;p90: Comparable;breaches: Comparable;responses: Comparable;};
  series: {key: string;label: string;compliance: number | null;previous: number | null;breaches: number;}[];
  byCategory: SlaGroupRow[];
  byLga: SlaGroupRow[];
  vendors: SlaVendorRow[];
  atRisk: SlaVendorRow[];
  options: {categories: {id: TradeCategory;label: string;}[];lgas: NigerLga[];plans: {id: PlanLine;label: string;}[];};
}

export const SLA_RULE_INFO: SlaRuleInfo[] = (Object.keys(SLA_RULES) as SlaType[]).map((type) => ({ type, ...SLA_RULES[type] }));
export const ALL_SLA_FILTERS: SlaFilters = { slaType: 'all', category: 'all', lga: 'all', plan: 'all' };

/** Judges every response (matching the filters) requested within the range, on each vendor's own clock. */
function judgedResponses(facts: AnalyticsFacts, cover: Map<string, CoverageFact[]>, f: SlaFilters, range: DateRange, now: Date) {
  const rows = facts.responses.filter(
    (r) =>
    within(r.requestedAt, range) && (
    f.slaType === 'all' || r.type === f.slaType) && (
    f.category === 'all' || r.category === f.category) && (
    f.lga === 'all' || r.lga === f.lga) && (
    f.plan === 'all' || planAt(cover, r.vendorId, new Date(r.requestedAt)) === f.plan)
  );
  return evaluateAll(rows, (id) => scheduleFor(facts, id), now);
}

type Judged = ReturnType<typeof judgedResponses>;

function groupJudged(rows: Judged, keyOf: (r: Judged[number]) => string): Map<string, Judged> {
  const map = new Map<string, Judged>();
  for (const r of rows) map.set(keyOf(r), [...map.get(keyOf(r)) ?? [], r]);
  return map;
}

function slaVendorRows(facts: AnalyticsFacts, cover: Map<string, CoverageFact[]>, current: Judged, previous: Judged, rangeEnd: Date): SlaVendorRow[] {
  const vendors = new Map(facts.vendors.map((v) => [v.id, v]));
  const marks = outreachMarks();
  const prev = groupJudged(previous, (r) => r.fact.vendorId);
  return [...groupJudged(current, (r) => r.fact.vendorId)].
  flatMap(([vendorId, rows]): SlaVendorRow[] => {
    const v = vendors.get(vendorId);
    if (!v) return [];
    const s = slaStats(rows);
    const before = prev.get(vendorId);
    const p = before ? slaStats(before).compliance : null;
    const plan = planAt(cover, vendorId, rangeEnd);
    const breaches = rows.filter((r) => r.outcome.verdict === 'breached').map((r) => r.fact.requestedAt).sort();
    return [{
      vendorId,
      name: v.name,
      current: v.current,
      category: v.category,
      categoryLabel: categoryLabel(v.category),
      lga: primaryLga(v),
      plan,
      planLabel: PLAN_LINE_LABELS[plan],
      responses: s.total,
      compliance: s.compliance,
      previousCompliance: p,
      trend: s.compliance !== null && p !== null ? Math.round((s.compliance - p) * 10) / 10 : null,
      averageMinutes: s.average,
      medianMinutes: s.median,
      breaches: s.breached,
      lastBreachAt: breaches.at(-1) ?? null,
      outreach: marks.get(vendorId) ?? []
    }];
  }).
  sort((a, b) => (b.compliance ?? -1) - (a.compliance ?? -1) || a.breaches - b.breaches || a.name.localeCompare(b.name));
}

/** Current vendors with repeated breaches in the period (SLA_SETTINGS.repeatBreachThreshold), most first. */
const slaAtRisk = (rows: SlaVendorRow[]) =>
rows.filter((r) => r.current && r.breaches >= SLA_SETTINGS.repeatBreachThreshold).sort((a, b) => b.breaches - a.breaches || (a.compliance ?? 0) - (b.compliance ?? 0));

function slaGroups(rows: Judged, keyOf: (r: Judged[number]) => string, labelOf: (key: string) => string, order?: readonly string[]): SlaGroupRow[] {
  const map = groupJudged(rows, keyOf);
  const keys = order ? order.filter((k) => map.has(k)) : [...map.keys()];
  const out = keys.map((key) => {
    const s = slaStats(map.get(key) ?? []);
    return { key, label: labelOf(key), median: s.median, p90: s.p90, compliance: s.compliance, count: s.total };
  });
  return order ? out : out.sort((a, b) => (b.median ?? 0) - (a.median ?? 0));
}

/** GET /admin/analytics/sla?range&type&category&lga&plan — response-time SLA compliance. */
export function getSlaAnalytics(q: AnalyticsQuery, filters: SlaFilters = ALL_SLA_FILTERS): Promise<SlaAnalytics> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.ViewAnalytics);
    const now = new Date();
    const facts = collectFacts();
    const cover = coverByVendor(facts.coverage);
    const { range, previous, buckets, previousBuckets } = period(q, now);
    const current = judgedResponses(facts, cover, filters, range, now);
    const before = judgedResponses(facts, cover, filters, previous, now);
    const s = slaStats(current);
    const p = slaStats(before);
    const inBucket = (rows: Judged, b: DateRange) => rows.filter((r) => within(r.fact.requestedAt, b));
    const vendors = slaVendorRows(facts, cover, current, before, range.end);

    return {
      range: iso(range),
      previous: iso(previous),
      bucketSize: bucketSizeFor(range),
      generatedAt: facts.generatedAt,
      rules: SLA_RULE_INFO,
      repeatBreachThreshold: SLA_SETTINGS.repeatBreachThreshold,
      filters,
      summary: {
        compliance: comparable(s.compliance ?? 0, p.compliance),
        median: comparable(s.median ?? 0, p.median),
        p90: comparable(s.p90 ?? 0, p.p90),
        breaches: comparable(s.breached, p.total ? p.breached : null),
        responses: comparable(s.total, p.total || null)
      },
      series: buckets.map((b, i) => {
        const inThis = slaStats(inBucket(current, b));
        const prevBucket = previousBuckets[i];
        return { key: b.key, label: b.label, compliance: inThis.compliance, previous: prevBucket ? slaStats(inBucket(before, prevBucket)).compliance : null, breaches: inThis.breached };
      }),
      byCategory: slaGroups(current, (r) => r.fact.category, categoryLabel),
      byLga: slaGroups(current, (r) => r.fact.lga, (k) => k, nigerLgas),
      vendors,
      atRisk: slaAtRisk(vendors),
      options: {
        categories: tradeCategories.map((c) => ({ id: c.id, label: c.label })),
        lgas: [...nigerLgas],
        plans: (Object.keys(PLAN_LINE_LABELS) as PlanLine[]).map((id) => ({ id, label: PLAN_LINE_LABELS[id] }))
      }
    };
  }, LATENCY);
}

export interface SlaHistoryRow {
  id: string;
  type: SlaType;
  typeLabel: string;
  label: string;
  lga: NigerLga;
  requestedAt: string;
  respondedAt: string | null;
  deadline: string;
  verdict: SlaVerdict;
  responseMinutes: number | null;
  lateMinutes: number;
}

export interface VendorSlaHistory {
  range: {start: string;end: string;};
  vendor: {id: string;name: string;categoryLabel: string;lga: NigerLga;current: boolean;};
  summary: ReturnType<typeof slaStats>;
  byType: {type: SlaType;label: string;stats: ReturnType<typeof slaStats>;}[];
  rows: SlaHistoryRow[];
  outreach: OutreachMark[];
}

/** GET /admin/analytics/sla/vendors/:id?range — one vendor's requests and how quickly they answered. */
export function getVendorSlaHistory(vendorId: string, q: AnalyticsQuery): Promise<VendorSlaHistory> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.ViewAnalytics);
    const now = new Date();
    const facts = collectFacts();
    const v = facts.vendors.find((x) => x.id === vendorId);
    if (!v) throw new ApiError('We couldn’t find that vendor.', 404);
    const { range } = period(q, now);
    const judged = evaluateAll(facts.responses.filter((r) => r.vendorId === vendorId && within(r.requestedAt, range)), () => scheduleFor(facts, vendorId), now);
    return {
      range: iso(range),
      vendor: { id: v.id, name: v.name, categoryLabel: categoryLabel(v.category), lga: primaryLga(v), current: v.current },
      summary: slaStats(judged),
      byType: SLA_RULE_INFO.map((r) => ({ type: r.type, label: r.label, stats: slaStats(judged.filter((j) => j.fact.type === r.type)) })).filter((t) => t.stats.total > 0),
      rows: judged.
      map(({ fact, outcome }) => ({
        id: fact.id,
        type: fact.type,
        typeLabel: SLA_RULES[fact.type].label,
        label: fact.label,
        lga: fact.lga,
        requestedAt: fact.requestedAt,
        respondedAt: fact.respondedAt,
        deadline: outcome.deadline.toISOString(),
        verdict: outcome.verdict,
        responseMinutes: outcome.responseMinutes,
        lateMinutes: outcome.lateMinutes
      })).
      sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
      outreach: outreachMarks().get(vendorId) ?? []
    };
  }, 400);
}

/* ---------- Task 107: vendor churn ---------- */

export type ChurnRiskSignal = 'grace' | 'activity' | 'rating';

export interface ChurnRiskRow {
  vendorId: string;
  name: string;
  categoryLabel: string;
  lga: NigerLga;
  planLabel: string;
  signals: {signal: ChurnRiskSignal;text: string;}[];
  outreach: OutreachMark[];
}

export interface ChurnedVendorRow {
  vendorId: string;
  name: string;
  categoryLabel: string;
  lga: NigerLga;
  planLabel: string;
  tierLabel: string;
  association: string;
  churnedAt: string;
  returnedAt: string | null;
  reason: string | null;
  comment: string | null;
}

export interface ChurnBreakdownRow {
  group: string;
  atStart: number;
  churned: number;
  rate: number;
}

export type ChurnBreakdownKey = 'plan' | 'category' | 'lga' | 'tier' | 'association';

export interface ChurnAnalytics extends AnalyticsPeriod {
  type: ChurnType;
  definition: string;
  inactiveDays: number;
  summary: {rate: Comparable;churned: Comparable;retained: Comparable;lifetimeMonths: Comparable;};
  series: {key: string;label: string;rate: number;previous: number | null;churned: number;atStart: number;}[];
  cohorts: ReturnType<typeof cohortRetention>;
  breakdowns: Record<ChurnBreakdownKey, ChurnBreakdownRow[]>;
  reasons: {reason: ChurnReasonId;label: string;count: number;share: number;comments: string[];}[];
  atRisk: ChurnRiskRow[];
  winBacks: {vendorId: string;name: string;churnedAt: string;returnedAt: string;daysAway: number;}[];
  churned: ChurnedVendorRow[];
}

/** The churn helpers' inputs as they stood at `now` (later completions left out). */
function churnContext(facts: AnalyticsFacts, cover: Map<string, CoverageFact[]>, now: Date): ChurnContext {
  return { vendors: facts.vendors, cover, work: facts.work.filter((w) => !w.completedAt || new Date(w.completedAt) <= now), now };
}

/**
 * Current vendors who look likely to leave, and why: in the grace period (subscription ended, not
 * renewed yet), falling completed work, or a declining rating (thresholds in CHURN.risk).
 */
function churnAtRisk(facts: AnalyticsFacts, cover: Map<string, CoverageFact[]>, now: Date): ChurnRiskRow[] {
  const marks = outreachMarks();
  return facts.vendors.
  filter((v) => v.current).
  flatMap((v): ChurnRiskRow[] => {
    const signals: ChurnRiskRow['signals'] = [];
    const own = cover.get(v.id) ?? [];
    if (statusAt(own, now) === SUBSCRIPTION_STATUS.Grace) {
      const c = currentCover(own, now);
      signals.push({ signal: 'grace', text: c ? `In the grace period: subscription ended ${format(new Date(c.end), 'd MMM')}, not renewed yet` : 'In the grace period' });
    }
    const activity = activityTrend(v.id, facts.work, now);
    if (activity.falling) signals.push({ signal: 'activity', text: `Completed ${activity.recent} in the last ${CHURN.risk.activityWindowDays} days, down from ${activity.before}` });
    const rating = ratingTrend(ratingsTimelineNow(v.id).map((r) => r.rating));
    if (rating.declining) signals.push({ signal: 'rating', text: `Latest ${CHURN.risk.recentReviews} reviews average ${rating.recent}★, down from ${rating.earlier}★` });
    if (signals.length === 0) return [];
    return [{ vendorId: v.id, name: v.name, categoryLabel: categoryLabel(v.category), lga: primaryLga(v), planLabel: PLAN_LINE_LABELS[planAt(cover, v.id, now)], signals, outreach: marks.get(v.id) ?? [] }];
  }).
  sort((a, b) => b.signals.length - a.signals.length || a.name.localeCompare(b.name));
}

/** GET /admin/analytics/churn?range&type — vendor churn (subscription or activity), cohorts and win-backs. */
export function getChurnAnalytics(q: AnalyticsQuery, type: ChurnType = 'subscription'): Promise<ChurnAnalytics> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.ViewAnalytics);
    const now = new Date();
    const facts = collectFacts();
    const cover = coverByVendor(facts.coverage);
    const { range, previous, buckets, previousBuckets } = period(q, now);
    const ctx = churnContext(facts, cover, now);
    const events = churnEvents(type, ctx);
    const s = churnSummary(type, ctx, range, events);
    const p = churnSummary(type, ctx, previous, events);
    const prevSeries = churnSeries(type, ctx, previousBuckets);
    const vendors = new Map(facts.vendors.map((v) => [v.id, v]));
    const associations = associationOf();
    const groupBy = (groupOf: (v: VendorFact) => string) => churnBreakdown(type, ctx, range, groupOf, events).map(({ group, atStart, churned, rate }) => ({ group, atStart, churned, rate }));
    const reasonsIn = facts.churnReasons.filter((r) => within(r.at, range));
    const latestReason = (vendorId: string) => facts.churnReasons.filter((r) => r.vendorId === vendorId).sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
    const churnedIds = new Set(s.churnedIds);

    return {
      range: iso(range),
      previous: iso(previous),
      bucketSize: bucketSizeFor(range),
      generatedAt: facts.generatedAt,
      type,
      definition: CHURN.definitions[type],
      inactiveDays: CHURN.inactiveDays,
      summary: {
        rate: comparable(s.rate, p.atStart ? p.rate : null),
        churned: comparable(s.churned, p.atStart ? p.churned : null),
        retained: comparable(s.retained, p.atStart ? p.retained : null),
        lifetimeMonths: comparable(averageLifetimeMonths(type, ctx, events), averageLifetimeMonths(type, churnContext(facts, cover, previous.end)))
      },
      series: churnSeries(type, ctx, buckets).map((b, i) => ({ ...b, previous: prevSeries[i]?.rate ?? null })),
      cohorts: cohortRetention(type, ctx),
      breakdowns: {
        plan: groupBy((v) => PLAN_LINE_LABELS[planAt(cover, v.id, range.start)]),
        category: groupBy((v) => categoryLabel(v.category)),
        lga: groupBy(primaryLga),
        tier: groupBy((v) => tierLabel(v.verification)),
        association: groupBy((v) => associations.get(v.id) ?? 'Not in an association')
      },
      reasons: (Object.keys(CHURN_REASON_LABELS) as ChurnReasonId[]).
      map((reason) => {
        const given = reasonsIn.filter((r) => r.reason === reason);
        return {
          reason,
          label: CHURN_REASON_LABELS[reason],
          count: given.length,
          share: reasonsIn.length ? Math.round(given.length / reasonsIn.length * 1000) / 10 : 0,
          comments: given.map((r) => r.comment).filter(Boolean)
        };
      }).
      filter((r) => r.count > 0).
      sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
      atRisk: churnAtRisk(facts, cover, now),
      winBacks: winBacks(type, ctx, range, events).map((w) => ({
        vendorId: w.vendorId,
        name: vendors.get(w.vendorId)?.name ?? w.vendorId,
        churnedAt: w.churnedAt.toISOString(),
        returnedAt: w.returnedAt.toISOString(),
        daysAway: w.daysAway
      })),
      churned: events.
      filter((e) => churnedIds.has(e.vendorId) && within(e.at.toISOString(), range)).
      flatMap((e): ChurnedVendorRow[] => {
        const v = vendors.get(e.vendorId);
        if (!v) return [];
        const why = latestReason(v.id);
        return [{
          vendorId: v.id,
          name: v.name,
          categoryLabel: categoryLabel(v.category),
          lga: primaryLga(v),
          planLabel: PLAN_LINE_LABELS[planAt(cover, v.id, subDays(e.at, 1))],
          tierLabel: tierLabel(v.verification),
          association: associations.get(v.id) ?? '',
          churnedAt: e.at.toISOString(),
          returnedAt: e.returnedAt?.toISOString() ?? null,
          reason: why ? CHURN_REASON_LABELS[why.reason] : null,
          comment: why?.comment || null
        }];
      })
    };
  }, LATENCY);
}

/* ---------- Vendor outreach (Support): the at-risk lists without the rest of analytics ---------- */

export interface OutreachQueues {
  generatedAt: string;
  slaWindowDays: number;
  repeatBreachThreshold: number;
  sla: SlaVendorRow[];
  churn: ChurnRiskRow[];
}

/** On the outreach page, response-time breaches are counted over this many recent days. */
const OUTREACH_SLA_DAYS = 30;

/** GET /admin/outreach — vendors at risk on response times or of churning, for Support to follow up. */
export function getOutreachQueues(): Promise<OutreachQueues> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.VendorOutreach);
    const now = new Date();
    const facts = collectFacts();
    const cover = coverByVendor(facts.coverage);
    const range = { start: subDays(now, OUTREACH_SLA_DAYS), end: now };
    const current = judgedResponses(facts, cover, ALL_SLA_FILTERS, range, now);
    const before = judgedResponses(facts, cover, ALL_SLA_FILTERS, previousRange(range), now);
    return {
      generatedAt: facts.generatedAt,
      slaWindowDays: OUTREACH_SLA_DAYS,
      repeatBreachThreshold: SLA_SETTINGS.repeatBreachThreshold,
      sla: slaAtRisk(slaVendorRows(facts, cover, current, before, now)),
      churn: churnAtRisk(facts, cover, now)
    };
  }, LATENCY);
}
