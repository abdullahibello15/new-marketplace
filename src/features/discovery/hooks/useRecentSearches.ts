import { useCallback } from 'react';
import { usePersistentState } from '../../../hooks/usePersistentState';
import { RECENT_SEARCHES_MAX, STORAGE_KEYS } from '../constants';
import { recentSearchesSchema } from '../schemas';
import type { RecentSearch, SearchTarget } from '../types';

const EMPTY: RecentSearch[] = [];

const parseRecent = (raw: unknown): RecentSearch[] | null => {
  const result = recentSearchesSchema.safeParse(raw);
  return result.success ? result.data : null;
};

const sameTarget = (a: SearchTarget, b: SearchTarget) =>
a.kind === 'category' && b.kind === 'category' ?
a.category === b.category :
a.kind === 'query' && b.kind === 'query' && a.query.toLowerCase() === b.query.toLowerCase();

/** The customer's last few searches, newest first, kept on this device. */
export function useRecentSearches() {
  const [items, setItems] = usePersistentState<RecentSearch[]>(STORAGE_KEYS.RecentSearches, EMPTY, parseRecent);

  const add = useCallback(
    (entry: RecentSearch) => setItems((prev) => [entry, ...prev.filter((r) => !sameTarget(r.target, entry.target))].slice(0, RECENT_SEARCHES_MAX)),
    [setItems]
  );
  const clear = useCallback(() => setItems(EMPTY), [setItems]);

  return { items, add, clear };
}
