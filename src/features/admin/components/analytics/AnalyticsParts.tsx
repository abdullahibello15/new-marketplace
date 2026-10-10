import { useId, useState, type ReactNode } from 'react';
import { DownloadIcon, InfoIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { downloadCsv } from './chartUtils';
import type { Comparable } from '../../analytics/types';

/** Shared building blocks for the analytics dashboard: cards, tooltips, chart frames and CSV export. */

/** A small "i" that explains a figure (hover, focus or tap). */
export function InfoTip({ text, label = 'What does this mean?' }: {text: string;label?: string;}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded-full p-0.5 text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

        <InfoIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open &&
      <span id={id} role="tooltip" className="absolute left-1/2 top-6 z-20 w-64 -translate-x-1/2 rounded-lg border border-line bg-white p-2.5 text-xs font-normal normal-case tracking-normal text-ink shadow-lg">
          {text}
        </span>
      }
    </span>);

}

/** The change vs the previous period, coloured by whether up is good. */
export function Delta({ c, upIsGood = true, suffix = '%' }: {c: Comparable;upIsGood?: boolean;suffix?: string;}) {
  if (c.change === null) return <span className="text-xs text-muted">{c.previous === null ? '' : 'no previous data'}</span>;
  if (c.change === 0) return <span className="text-xs font-semibold text-muted">no change</span>;
  const up = c.change > 0;
  const good = up === upIsGood;
  const Icon = up ? TrendingUpIcon : TrendingDownIcon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${good ? 'text-pine' : 'text-clay-dark'}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {up ? '+' : ''}
      {c.change}
      {suffix}
      <span className="sr-only"> vs the previous period</span>
    </span>);

}

interface MetricCardProps {
  label: string;
  value: string;
  c?: Comparable;
  compare: boolean;
  /** Shown under the value, e.g. "previous: ₦1.2m". */
  previousText?: string;
  info?: string;
  upIsGood?: boolean;
}

export function MetricCard({ label, value, c, compare, previousText, info, upIsGood }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3.5">
      <p className="flex items-center gap-1 text-sm font-semibold text-muted">
        {label}
        {info && <InfoTip text={info} label={`About ${label}`} />}
      </p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      {compare && c &&
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2">
          <Delta c={c} upIsGood={upIsGood} />
          {previousText && <span className="text-xs text-muted">{previousText}</span>}
        </p>
      }
    </div>);

}

export function ExportCsvButton({ fileName, rows, label }: {fileName: string;rows: () => (string | number)[][];label: string;}) {
  return (
    <Button variant="ghost" size="sm" icon={DownloadIcon} onClick={() => downloadCsv(fileName, rows())} aria-label={`Export ${label} as CSV`}>
      CSV
    </Button>);

}

interface ChartCardProps {
  title: string;
  info?: string;
  /** Builds the CSV rows (header first). */
  csv?: {fileName: string;rows: () => (string | number)[][];};
  empty?: boolean;
  emptyText?: string;
  className?: string;
  children: ReactNode;
}

/** A titled card for a chart or table, with CSV export and an empty state. */
export function ChartCard({ title, info, csv, empty, emptyText = 'No data for this period.', className = '', children }: ChartCardProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`min-w-0 rounded-2xl border border-line bg-white p-4 lg:p-5 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <h3 id={id} className="flex flex-1 items-center gap-1 font-bold text-ink">
          {title}
          {info && <InfoTip text={info} label={`About ${title}`} />}
        </h3>
        {csv && !empty && <ExportCsvButton fileName={csv.fileName} rows={csv.rows} label={title} />}
      </div>
      {empty ? <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{emptyText}</p> : children}
    </section>);

}

/** Skeletons in the dashboard's layout while figures load. */
export function AnalyticsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading figures…</span>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) =>
        <div key={i} aria-hidden="true" className="h-24 animate-pulse rounded-2xl bg-sand" />
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div aria-hidden="true" className="h-72 animate-pulse rounded-2xl bg-sand" />
        <div aria-hidden="true" className="h-72 animate-pulse rounded-2xl bg-sand" />
      </div>
    </div>);

}
