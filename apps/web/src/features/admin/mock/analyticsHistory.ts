import { addDays, addHours, endOfMonth, format, startOfMonth, subDays, subMonths } from 'date-fns';
import { formerVendors } from '../../../data/formerVendors';
import { findTradeCategory } from '../../../data/tradeCategories';
import { vendors as directoryVendors } from '../../../data/vendors';
import { makeWorkingHours } from '../../../data/weekdays';
import { BILLING_RULES } from '../../vendor-dashboard/plans';
import { mockAssociations } from '../../vendor-dashboard/mock/associations';
import { mockHistoryInvoices, mockInvoices } from '../../vendor-dashboard/mock/subscription';
import { addBusinessMinutes, type VendorSchedule } from '../analytics/sla';
import type { NigerLga, TradeCategory, WorkingHours } from '../../../types/marketplace';
import type { BusinessKind, ResponseFact, WorkFact } from '../analytics/types';

/*
 * MOCK platform history for analytics: ~25 months of jobs and orders by every vendor, including vendors
 * who have since left, with how quickly each vendor replied. The live demo stores only hold the last few
 * weeks (the jobs and orders you can open in the app); this archive stands in for everything else, so
 * trends, SLAs and cohorts have something to show. It's raw records, generated deterministically
 * (seeded), never chart values: every figure is still calculated from it by the analytics helpers.
 *
 *  - Work only happens while the vendor's subscription covers it (plus the grace period), so lapses and
 *    leaving show up in activity too.
 *  - Reply times are working-time minutes added with the SLA helper (the vendor's hours and blocked
 *    days), and some vendors are slower than others.
 */

const MONTHS = 25;
/** The demo vendor's recent work is in the live stores; the archive stops short of it. */
const DEMO_VENDOR = 'bala-plumbing';
const DEMO_LIVE_DAYS = 45;
/** Vendors who usually reply slowly, and quickly (so SLA "at risk" has real cases). */
const SLOW = new Set(['swift-wheels', 'kontagora-fresh-mart', 'suleja-power-electrical', 'emeka-paints', 'former-kpakungu-paints', 'former-gidan-kwano-fix']);
const FAST = new Set(['bala-plumbing', 'zainab-dispatch', 'hauwa-tailoring', 'fatima-fresh-foods', 'ibrahim-electrical']);
/** Former vendors' records don't keep hours; assume a usual Mon–Sat working week. */
export const DEFAULT_HOURS = makeWorkingHours({ mon: ['08:00', '18:00'], tue: ['08:00', '18:00'], wed: ['08:00', '18:00'], thu: ['08:00', '18:00'], fri: ['08:00', '18:00'], sat: ['08:00', '18:00'] });

/** mulberry32: small, fast, deterministic. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = a + 0x6d2b79f5 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const ALL_INVOICES = [...mockInvoices, ...mockHistoryInvoices];
const memberVendor = new Map(mockAssociations.flatMap((a) => a.members.map((m) => [m.id, m.vendorId] as const)));

/** When each vendor first paid for a subscription (their join date), from the subscription history. */
export function joinDates(): Map<string, string> {
  const map = new Map<string, string>();
  for (const inv of ALL_INVOICES) {
    if (inv.associationId) continue;
    const current = map.get(inv.vendorId);
    if (!current || inv.periodStart < current) map.set(inv.vendorId, inv.periodStart);
  }
  return map;
}

/** Paid stretches per vendor (their own invoices and any bundle that covered them), grace included. */
function coverWindows(): Map<string, {start: number;end: number;}[]> {
  const map = new Map<string, {start: number;end: number;}[]>();
  const add = (vendorId: string, start: string, end: string) =>
  map.set(vendorId, [...map.get(vendorId) ?? [], { start: new Date(start).getTime(), end: addDays(new Date(end), BILLING_RULES.graceDays).getTime() }]);
  for (const inv of ALL_INVOICES) {
    if (inv.status !== 'paid') continue;
    if (inv.associationId) inv.memberIds.forEach((m) => memberVendor.get(m) && add(memberVendor.get(m) as string, inv.periodStart, inv.periodEnd));else
    add(inv.vendorId, inv.periodStart, inv.periodEnd);
  }
  return map;
}

/** MOCK days off: about one blocked day a month per vendor (plus the demo vendor's own, added by the facts layer). */
export function archiveBlockedDays(now = new Date()): Map<string, Set<string>> {
  const rnd = seeded(77);
  const map = new Map<string, Set<string>>();
  for (const id of [...directoryVendors.map((v) => v.id), ...formerVendors.map((f) => f.id)]) {
    const days = new Set<string>();
    for (let m = MONTHS; m >= 0; m--) {
      if (rnd() < 0.7) days.add(format(addDays(startOfMonth(subMonths(now, m)), Math.floor(rnd() * 27)), 'yyyy-MM-dd'));
    }
    map.set(id, days);
  }
  return map;
}

interface ArchiveVendor {
  id: string;
  kind: BusinessKind;
  category: TradeCategory;
  areas: NigerLga[];
  hours: WorkingHours;
  joinedAt: Date;
  leftAt: Date | null;
  speed: number;
  /** A job or order value and what it was for. */
  item: (rnd: () => number) => {value: number;label: string;};
}

const roundTo500 = (n: number) => Math.max(500, Math.round(n / 500) * 500);
const speedOf = (id: string, rnd: () => number) => SLOW.has(id) ? 3 : FAST.has(id) ? 0.5 : 0.8 + rnd() * 0.6;

function archiveVendors(now: Date, rnd: () => number): ArchiveVendor[] {
  const joined = joinDates();
  const current = directoryVendors.map((v): ArchiveVendor => {
    const kind = findTradeCategory(v.tradeCategory)?.kind === 'retail' ? 'retail' : 'service';
    return {
      id: v.id,
      kind,
      category: v.tradeCategory,
      areas: v.serviceAreas.length ? v.serviceAreas : [v.lga.replace(/ LGA$/, '') as NigerLga],
      hours: v.workingHours,
      joinedAt: new Date(joined.get(v.id) ?? subMonths(now, 12)),
      leftAt: null,
      speed: speedOf(v.id, rnd),
      item: (r) => {
        if (kind === 'retail' && v.products.length) {
          const lines = 1 + Math.floor(r() * 3);
          let total = 0;
          for (let i = 0; i < lines; i++) total += v.products[Math.floor(r() * v.products.length)].price * (1 + Math.floor(r() * 2));
          return { value: total + [0, 1000, 1500][Math.floor(r() * 3)], label: 'Order' };
        }
        const s = v.services[Math.floor(r() * v.services.length)];
        return s ? { value: roundTo500(s.minPrice + r() * (s.maxPrice - s.minPrice)), label: s.name } : { value: 10_000, label: 'Job' };
      }
    };
  });
  const former = formerVendors.map((f): ArchiveVendor => {
    const kind = findTradeCategory(f.tradeCategory)?.kind === 'retail' ? 'retail' : 'service';
    return {
      id: f.id,
      kind,
      category: f.tradeCategory,
      areas: f.serviceAreas,
      hours: DEFAULT_HOURS,
      joinedAt: subMonths(now, f.joinedMonthsAgo),
      leftAt: subMonths(now, f.leftMonthsAgo),
      speed: speedOf(f.id, rnd),
      item: (r) => ({ value: roundTo500(f.typicalValue * (0.6 + r() * 0.8)), label: kind === 'retail' ? 'Order' : findTradeCategory(f.tradeCategory)?.label ?? 'Job' })
    };
  });
  return [...current, ...former];
}

export interface Archive {
  work: WorkFact[];
  responses: ResponseFact[];
  blockedDays: Map<string, Set<string>>;
}

/** Generates the archive relative to `now` (deterministic for the same day). */
export function buildArchive(now = new Date()): Archive {
  const rnd = seeded(20261008);
  const work: WorkFact[] = [];
  const responses: ResponseFact[] = [];
  const blockedDays = archiveBlockedDays(now);
  const covers = coverWindows();
  const nowMs = now.getTime();
  let n = 0;

  for (const v of archiveVendors(now, rnd)) {
    const schedule: VendorSchedule = { workingHours: v.hours, blockedDates: blockedDays.get(v.id) ?? new Set() };
    const covered = (t: Date) => (covers.get(v.id) ?? []).some((c) => t.getTime() >= c.start && t.getTime() <= c.end);
    /** A reply `scale`× this vendor's usual speed, in working time; null if it never came (or hasn't yet). */
    const reply = (from: Date, base: number, spread: number, scale = 1) => {
      const minutes = Math.round((base + rnd() ** 2 * spread) * v.speed * scale);
      const at = addBusinessMinutes(from, minutes, schedule);
      return at.getTime() < nowMs ? at : null;
    };
    const size = 0.8 + rnd() * 0.8;
    const base = v.kind === 'retail' ? 8 : 6;

    for (let monthsAgo = MONTHS; monthsAgo >= 0; monthsAgo--) {
      const monthStart = startOfMonth(subMonths(now, monthsAgo));
      const monthEnd = Math.min(endOfMonth(monthStart).getTime(), nowMs);
      // Business grows over time: later months are busier.
      const growth = 0.55 + 0.45 * (1 - monthsAgo / MONTHS);
      const count = Math.round(base * size * growth * (0.7 + rnd() * 0.6));
      for (let i = 0; i < count; i++) {
        const requested = new Date(monthStart.getTime() + rnd() * (monthEnd - monthStart.getTime()));
        const { value, label } = v.item(rnd);
        const roll = [rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()];
        const inWindow =
        requested >= v.joinedAt && (!v.leftAt || requested < v.leftAt) && requested.getTime() < nowMs - 12 * 3_600_000 && covered(requested) && (
        v.id !== DEMO_VENDOR || requested < subDays(now, DEMO_LIVE_DAYS));
        if (!inWindow) continue;

        const later = (d: Date | null, hours: number) => {
          if (!d) return null;
          const next = addHours(d, hours);
          return next.getTime() < nowMs ? next : null;
        };
        const isService = v.kind === 'service';
        n += 1;
        const id = `arc-${n}`;
        const lga = v.areas[Math.floor(roll[1] * v.areas.length)] ?? v.areas[0];
        const subject = isService ? `Job #A${n} · ${label}` : `Order #A${n}`;

        // The vendor's first reply: most reply, a few never do. Services: quote or decline. Retail: confirm or not.
        const firstReply = roll[6] < 0.04 ? null : reply(requested, 10, 220);
        const positive = roll[0] < (isService ? 0.88 : 0.94);
        // Half the quotes go with the first reply; the rest follow after a site visit or a question.
        const quoted = isService && firstReply && positive ? roll[5] < 0.5 ? firstReply : reply(firstReply, 20, 300) : null;
        const accepted = isService ? quoted && roll[2] < 0.72 ? later(quoted, 6 + roll[3] * 42) : null : firstReply && positive ? firstReply : null;
        const outcome = roll[4];
        const cancelled = accepted && outcome < (isService ? 0.06 : 0.04) ? later(accepted, 1 + roll[5] * 47) : null;
        const disputed = accepted && !cancelled && outcome >= (isService ? 0.95 : 0.97) ? later(accepted, 48 + roll[5] * 72) : null;
        const completed = accepted && !cancelled && !disputed ? later(accepted, 24 + roll[5] * (isService ? 96 : 72)) : null;
        const paid = completed || disputed;

        work.push({
          id,
          kind: v.kind,
          vendorId: v.id,
          category: v.category,
          lga,
          requestedAt: requested.toISOString(),
          quotedAt: quoted?.toISOString() ?? null,
          acceptedAt: accepted?.toISOString() ?? null,
          completedAt: completed?.toISOString() ?? null,
          cancelledAt: cancelled?.toISOString() ?? null,
          disputedAt: disputed?.toISOString() ?? null,
          value,
          paidVia: paid ? roll[0] < (isService ? 0.7 : 0.85) ? 'escrow' : 'cash' : null
        });

        const event = (suffix: string, type: ResponseFact['type'], from: Date, to: Date | null) =>
        responses.push({ id: `${id}-${suffix}`, vendorId: v.id, type, label: subject, category: v.category, lga, requestedAt: from.toISOString(), respondedAt: to?.toISOString() ?? null });
        event('first', 'first_response', requested, firstReply);
        // A decline answers the request, so there's no quote to wait for.
        if (isService) {
          if (!firstReply || positive) event('quote', 'quote', requested, quoted);
        } else event('confirm', 'order_confirm', requested, firstReply);
        // Some booked jobs get a reschedule request from the customer.
        if (isService && accepted && roll[3] < 0.1) {
          const asked = later(accepted, 2 + roll[5] * 20);
          if (asked) event('reschedule', 'reschedule_response', asked, reply(asked, 20, 400));
        }
        if (disputed) event('dispute', 'dispute_response', disputed, reply(disputed, 60, 900, 1.2));
      }
    }
  }
  return { work, responses, blockedDays };
}
