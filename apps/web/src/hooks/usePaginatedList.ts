import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../lib/errors';
import type { Page } from '../types/pagination';

export type PaginatedStatus = 'loading' | 'loadingMore' | 'ready' | 'error';

interface State<T> {
  items: T[];
  page: number;
  total: number;
  hasMore: boolean;
  status: PaginatedStatus;
  error: string | null;
}

const initial = { items: [], page: 0, total: 0, hasMore: false, status: 'loading', error: null } as const;

/**
 * Loads a list page by page ("Load more"). When `fetchPage` changes (new filters), the list resets
 * and page 1 loads; responses for outdated filters are ignored. `fetchPage` must be memoised.
 */
export function usePaginatedList<T>(fetchPage: (page: number) => Promise<Page<T>>) {
  const [state, setState] = useState<State<T>>({ ...initial, items: [] });
  const generation = useRef(0);

  const load = useCallback(
    (page: number) => {
      const gen = generation.current;
      setState((s) => ({ ...s, status: page === 1 ? 'loading' : 'loadingMore', error: null }));
      fetchPage(page).then(
        (result) => {
          if (gen !== generation.current) return;
          setState((s) => ({
            items: page === 1 ? result.items : [...s.items, ...result.items],
            page: result.page,
            total: result.total,
            hasMore: result.hasMore,
            status: 'ready',
            error: null
          }));
        },
        (e: unknown) => {
          if (gen !== generation.current) return;
          setState((s) => ({ ...s, status: 'error', error: errorMessage(e) }));
        }
      );
    },
    [fetchPage]
  );

  useEffect(() => {
    generation.current += 1;
    setState({ ...initial, items: [] });
    load(1);
  }, [load]);

  const busy = state.status === 'loading' || state.status === 'loadingMore';

  return {
    ...state,
    loadMore: () => !busy && state.hasMore && load(state.page + 1),
    /** Retries whatever failed: the first page, or the next one. */
    retry: () => load(state.page + 1)
  };
}
