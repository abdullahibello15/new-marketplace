import { BOM, toCsv } from '../../../../utils/csv';

/** Formatting and export helpers shared by the analytics charts and tables. */

/** Downloads rows as a CSV (with a BOM so Excel reads ₦ and accents correctly). */
export function downloadCsv(fileName: string, rows: (string | number)[][]) {
  const csv = BOM + toCsv(rows.map((r) => r.map((v) => String(v)))) + '\r\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Compact Naira for chart axes: ₦850, ₦12k, ₦1.4m. */
export function compactNaira(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (abs >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${n}`;
}

export const CHART_COLORS = { pine: '#1F4B4D', clay: '#CF5A2E', mustard: '#D9A933', purple: '#5B3E8A', blue: '#2B4A7A', grid: '#E7DECB', axis: '#6B665B' } as const;

/** Working-time minutes for people: 45 min, 2h 10m, 3d 4h (a "day" here is 24 hours of the clock). */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(minutes / (24 * 60));
  const h = Math.round(minutes % (24 * 60) / 60);
  return h ? `${d}d ${h}h` : `${d}d`;
}
