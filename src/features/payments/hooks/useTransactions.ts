import i18n from '../../../i18n';
import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { usePaginatedList } from '../../../hooks/usePaginatedList';
import { getTransactionSummary, listTransactions } from '../services/transactionService';
import type { TransactionFilters } from '../types';

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = { status: 'all', method: 'all', type: 'all', from: '', to: '', query: '', sort: 'newest' };

const SEARCH_DEBOUNCE_MS = 300;

/** The customer's transaction list: filters (search debounced), "Load more" pages, and the summary tiles. */
export function useTransactions() {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS);
  const query = useDebouncedValue(filters.query, SEARCH_DEBOUNCE_MS);
  const { status, method, type, from, to, sort } = filters;

  // A start date after the end date is shown as a field error rather than sent.
  const rangeError = from && to && from > to ? i18n.t('payments:tx.rangeError') : null;
  const fetchPage = useCallback(
    (page: number) => listTransactions({ status, method, type, from, to: rangeError ? '' : to, query, sort }, page),
    [status, method, type, from, to, query, sort, rangeError]
  );
  const list = usePaginatedList(fetchPage);
  const summary = useAsyncData(getTransactionSummary);

  const update = <K extends keyof TransactionFilters,>(key: K, value: TransactionFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const filtered = Object.entries(filters).some(([k, v]) => k !== 'sort' && v !== DEFAULT_TRANSACTION_FILTERS[k as keyof TransactionFilters]);

  return { filters, update, reset: () => setFilters(DEFAULT_TRANSACTION_FILTERS), filtered, rangeError, list, summary };
}
