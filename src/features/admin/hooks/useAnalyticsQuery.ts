import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isDateKey } from '../../../lib/dates';
import { nigerLgas } from '../../../data/nigerLgas';
import { tradeCategories } from '../../../data/tradeCategories';
import { RANGE_PRESETS } from '../analytics/config';
import { SLA_TYPE } from '../analytics/slaConfig';
import type { ChurnType } from '../analytics/churn';
import type { AnalyticsQuery, AnalyticsTab, BusinessKind, PlanLine, RangePreset, SlaFilters } from '../analytics/types';

const TABS: AnalyticsTab[] = ['vendors', 'gmv', 'subscriptions', 'sla', 'churn', 'queues'];
const DEFAULTS = { tab: 'vendors' as AnalyticsTab, preset: '30d' as RangePreset, kind: 'service' as BusinessKind, churn: 'subscription' as ChurnType };
const PLAN_LINES: PlanLine[] = ['starter', 'standard', 'premium', 'bundle', 'none'];

export interface AnalyticsQueryChanges {
  tab: AnalyticsTab;
  preset: RangePreset;
  from: string;
  to: string;
  compare: boolean;
  kind: BusinessKind;
  /** SLA tab: filters, vendor search and the vendor whose history is open. */
  sla: Partial<SlaFilters>;
  search: string;
  vendor: string | null;
  /** Churn tab: which definition. */
  churn: ChurnType;
}

/**
 * The dashboard's shared controls, kept in the URL (?tab=&range=&from=&to=&compare=&kind=, plus the SLA
 * tab's &type=&cat=&lga=&plan=&q=&vendor= and the churn tab's &churn=) so a view can be shared and Back
 * works. Unknown values fall back to the defaults rather than being trusted.
 */
export function useAnalyticsQuery() {
  const [params, setParams] = useSearchParams();

  const tab = (TABS.find((t) => t === params.get('tab')) ?? DEFAULTS.tab) as AnalyticsTab;
  const preset = (RANGE_PRESETS.find((p) => p.id === params.get('range'))?.id ?? DEFAULTS.preset) as RangePreset;
  const from = isDateKey(params.get('from')) ? params.get('from') as string : '';
  const to = isDateKey(params.get('to')) ? params.get('to') as string : '';
  const compare = params.get('compare') === '1';
  const kind: BusinessKind = params.get('kind') === 'retail' ? 'retail' : 'service';

  const slaType = Object.values(SLA_TYPE).find((t) => t === params.get('type')) ?? 'all';
  const category = tradeCategories.find((c) => c.id === params.get('cat'))?.id ?? 'all';
  const lga = nigerLgas.find((l) => l === params.get('lga')) ?? 'all';
  const plan = PLAN_LINES.find((p) => p === params.get('plan')) ?? 'all';
  const search = (params.get('q') ?? '').slice(0, 80);
  const vendor = params.get('vendor') || null;
  const churn: ChurnType = params.get('churn') === 'activity' ? 'activity' : DEFAULTS.churn;

  const query: AnalyticsQuery = useMemo(() => ({ preset, from, to, compare, kind }), [preset, from, to, compare, kind]);
  const sla: SlaFilters = useMemo(() => ({ slaType, category, lga, plan }), [slaType, category, lga, plan]);

  const update = useCallback(
    (changes: Partial<AnalyticsQueryChanges>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const set = (key: string, value: string | null, fallback?: string) => value === null || value === '' || value === fallback ? next.delete(key) : next.set(key, value);
        if (changes.tab !== undefined) set('tab', changes.tab, DEFAULTS.tab);
        if (changes.preset !== undefined) set('range', changes.preset, DEFAULTS.preset);
        if (changes.from !== undefined) set('from', changes.from);
        if (changes.to !== undefined) set('to', changes.to);
        if (changes.compare !== undefined) set('compare', changes.compare ? '1' : null);
        if (changes.kind !== undefined) set('kind', changes.kind, DEFAULTS.kind);
        if (changes.sla?.slaType !== undefined) set('type', changes.sla.slaType, 'all');
        if (changes.sla?.category !== undefined) set('cat', changes.sla.category, 'all');
        if (changes.sla?.lga !== undefined) set('lga', changes.sla.lga, 'all');
        if (changes.sla?.plan !== undefined) set('plan', changes.sla.plan, 'all');
        if (changes.search !== undefined) set('q', changes.search.trim() ? changes.search : null);
        if (changes.vendor !== undefined) set('vendor', changes.vendor);
        if (changes.churn !== undefined) set('churn', changes.churn, DEFAULTS.churn);
        // Dates only mean something for a custom range.
        if ((changes.preset ?? preset) !== 'custom') {
          next.delete('from');
          next.delete('to');
        }
        return next;
      },
      { replace: true }
    ),
    [setParams, preset]
  );

  return { tab, query, sla, search, vendor, churn, update };
}
