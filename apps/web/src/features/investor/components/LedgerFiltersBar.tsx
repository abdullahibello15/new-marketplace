import { DownloadIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { bad, errorText, field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { LEDGER_ENTRY_TYPE, LEDGER_ENTRY_TYPE_META } from '../constants';
import type { LedgerEntryType, LedgerFilters } from '../types';

interface LedgerFiltersBarProps {
  filters: LedgerFilters;
  onChange: <K extends keyof LedgerFilters,>(key: K, value: LedgerFilters[K]) => void;
  onReset: () => void;
  filtered: boolean;
  rangeError: string | null;
  /** Exports the rows the filters show. */
  onExport: () => void;
  canExport: boolean;
}

const input = `${field} ${ok} py-2.5`;

/** Type and date range filters, and CSV export of what's shown. */
export function LedgerFiltersBar({ filters: f, onChange, onReset, filtered, rangeError, onExport, canExport }: LedgerFiltersBarProps) {
  return (
    <section aria-label="Filter the ledger" className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="ledger-type" className={labelClass}>Type</label>
          <select id="ledger-type" value={f.type} onChange={(e) => onChange('type', e.target.value as LedgerEntryType | 'all')} className={input}>
            <option value="all">All entries</option>
            {Object.values(LEDGER_ENTRY_TYPE).map((t) =>
            <option key={t} value={t}>{LEDGER_ENTRY_TYPE_META[t].label}</option>
            )}
          </select>
        </div>
        <div>
          <label htmlFor="ledger-from" className={labelClass}>From</label>
          <input id="ledger-from" type="date" value={f.from} max={f.to || undefined} onChange={(e) => onChange('from', e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="ledger-to" className={labelClass}>To</label>
          <input
            id="ledger-to"
            type="date"
            value={f.to}
            min={f.from || undefined}
            onChange={(e) => onChange('to', e.target.value)}
            aria-invalid={rangeError ? true : undefined}
            aria-describedby={rangeError ? 'ledger-range-error' : undefined}
            className={`${field} ${rangeError ? bad : ok} py-2.5`} />

        </div>
        <Button variant="outline" icon={DownloadIcon} onClick={onExport} disabled={!canExport}>
          Export CSV
        </Button>
      </div>
      {rangeError && <p id="ledger-range-error" className={errorText}>{rangeError}</p>}
      {filtered &&
      <Button variant="secondary" size="sm" onClick={onReset}>
          Clear filters
        </Button>
      }
    </section>);

}
