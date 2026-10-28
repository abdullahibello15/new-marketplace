import { format } from 'date-fns';
import { RefreshCwIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { SegmentedControl } from '../../../../components/ui/SegmentedControl';
import { field, label as labelClass, ok } from '../../../../components/vendor/formStyles';
import { toDateKey } from '../../../../lib/dates';
import { RANGE_PRESETS } from '../../analytics/config';
import type { AnalyticsQuery, RangePreset } from '../../analytics/types';

interface AnalyticsControlsProps {
  query: AnalyticsQuery;
  onChange: (changes: Partial<{preset: RangePreset;from: string;to: string;compare: boolean;}>) => void;
}

/** The date range (applies to every section) and "vs previous period". */
export function AnalyticsControls({ query, onChange }: AnalyticsControlsProps) {
  const today = toDateKey(new Date());
  const badRange = query.preset === 'custom' && query.from && query.to && query.from > query.to;
  return (
    <section aria-label="Date range" className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-3">
      <SegmentedControl<RangePreset> label="Date range" options={RANGE_PRESETS} value={query.preset} onChange={(preset) => onChange({ preset })} />
      {query.preset === 'custom' &&
      <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="an-from" className={labelClass}>From</label>
            <input id="an-from" type="date" max={query.to || today} value={query.from} onChange={(e) => onChange({ from: e.target.value })} className={`${field} ${ok} py-2`} />
          </div>
          <div>
            <label htmlFor="an-to" className={labelClass}>To</label>
            <input id="an-to" type="date" min={query.from || undefined} max={today} value={query.to} onChange={(e) => onChange({ to: e.target.value })} className={`${field} ${ok} py-2`} />
          </div>
          {(!query.from || !query.to || badRange) &&
        <p className="pb-2 text-xs text-muted">{badRange ? 'The start is after the end: showing the last 30 days.' : 'Pick both dates (until then: the last 30 days).'}</p>
        }
        </div>
      }
      <label className="ml-auto flex items-center gap-2 pb-1.5 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-pine" checked={query.compare} onChange={(e) => onChange({ compare: e.target.checked })} />
        vs previous period
      </label>
    </section>);

}

/** "1 Sep – 30 Sep 2026 · vs 2 Aug – 31 Aug 2026 · Updated 2:14 PM" with a refresh button. */
export function PeriodBar({ range, previous, compare, generatedAt, onRefresh, loading }: {range: {start: string;end: string;};previous: {start: string;end: string;};compare: boolean;generatedAt: string;onRefresh: () => void;loading: boolean;}) {
  const span = (r: {start: string;end: string;}) => `${format(new Date(r.start), 'd MMM yyyy')} – ${format(new Date(r.end), 'd MMM yyyy')}`;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      <span className="font-semibold text-ink">{span(range)}</span>
      {compare && <span>vs {span(previous)}</span>}
      <span aria-live="polite">· Last updated {format(new Date(generatedAt), 'd MMM, h:mm:ss a')}</span>
      <Button variant="ghost" size="sm" icon={RefreshCwIcon} onClick={onRefresh} loading={loading} className="ml-auto">
        Refresh
      </Button>
    </div>);

}
