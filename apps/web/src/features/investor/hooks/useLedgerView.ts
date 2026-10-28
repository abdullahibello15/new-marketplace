import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { filterLedger, ledgerCsv, withRunningBalance } from '../utils/ledger';
import type { Investment, LedgerEntry, LedgerFilters } from '../types';

export const DEFAULT_LEDGER_FILTERS: LedgerFilters = { type: 'all', from: '', to: '' };

/** The ledger table: running balances from the whole ledger, then type and date filters, and CSV export. */
export function useLedgerView(entries: readonly LedgerEntry[], investments: readonly Investment[]) {
  const [filters, setFilters] = useState<LedgerFilters>(DEFAULT_LEDGER_FILTERS);
  const rangeError = filters.from && filters.to && filters.from > filters.to ? 'The start date is after the end date.' : null;
  const allRows = useMemo(() => withRunningBalance(entries), [entries]);
  // Oldest first (for the export); the table shows newest first.
  const rows = useMemo(() => rangeError ? [] : filterLedger(allRows, filters), [allRows, filters, rangeError]);
  const newestFirst = useMemo(() => [...rows].reverse(), [rows]);

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([ledgerCsv(rows, investments)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `gwani-investor-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    filters,
    update: <K extends keyof LedgerFilters,>(key: K, value: LedgerFilters[K]) => setFilters((f) => ({ ...f, [key]: value })),
    reset: () => setFilters(DEFAULT_LEDGER_FILTERS),
    filtered: filters.type !== 'all' || filters.from !== '' || filters.to !== '',
    rangeError,
    rows,
    newestFirst,
    exportCsv
  };
}
