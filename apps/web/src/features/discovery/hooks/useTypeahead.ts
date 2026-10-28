import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { sanitizeText } from '../../../lib/sanitize';
import { QUERY_MAX_LENGTH, SUGGESTION_DEBOUNCE_MS } from '../constants';
import { getSuggestions } from '../services/discoveryService';
import { buildSearchUrl } from '../utils/searchUrl';
import { toRecentOptions, toSuggestionOptions } from '../utils/suggestionOptions';
import { usePlace } from './usePlace';
import { useRecentSearches } from './useRecentSearches';
import type { SearchTarget, SuggestionOption, SuggestionResults } from '../types';

export type TypeaheadStatus = 'recent' | 'loading' | 'ready' | 'error';

interface Fetched {
  term: string;
  status: 'loading' | 'ready' | 'error';
  data: SuggestionResults | null;
}

const IDLE: Fetched = { term: '', status: 'ready', data: null };

/**
 * Search-box behaviour: debounced suggestions grouped as categories, services and vendors; recent
 * searches when the box is empty; and combobox keyboard handling (↑ ↓ Enter Esc).
 */
export function useTypeahead(initialQuery = '') {
  const navigate = useNavigate();
  const { place } = usePlace();
  const recent = useRecentSearches();
  const [query, setQueryState] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fetched, setFetched] = useState<Fetched>(IDLE);

  const term = sanitizeText(query);
  const debounced = useDebouncedValue(term, SUGGESTION_DEBOUNCE_MS);

  useEffect(() => {
    if (!debounced) {
      setFetched(IDLE);
      return;
    }
    let cancelled = false;
    setFetched({ term: debounced, status: 'loading', data: null });
    getSuggestions(debounced, place).then(
      (data) => !cancelled && setFetched({ term: debounced, status: 'ready', data }),
      () => !cancelled && setFetched({ term: debounced, status: 'error', data: null })
    );
    return () => {
      cancelled = true;
    };
  }, [debounced, place]);

  const showingRecent = term === '';
  const options = useMemo<SuggestionOption[]>(
    () => showingRecent ? toRecentOptions(recent.items) : fetched.data ? toSuggestionOptions(fetched.data) : [],
    [showingRecent, recent.items, fetched.data]
  );

  // A new set of options means the old highlighted row no longer exists.
  useEffect(() => setActiveIndex(-1), [options]);

  const status: TypeaheadStatus = showingRecent ?
  'recent' :
  term !== debounced || fetched.status === 'loading' ?
  'loading' :
  fetched.status;

  function go(target: SearchTarget, label: string) {
    recent.add({ label, target });
    setOpen(false);
    setActiveIndex(-1);
    navigate(buildSearchUrl(target));
  }

  const select = (option: SuggestionOption) => go(option.target, option.label);

  /** Enter with nothing highlighted searches for exactly what was typed. */
  function submit() {
    if (activeIndex >= 0 && options[activeIndex]) select(options[activeIndex]);else
    if (term) go({ kind: 'query', query: term }, term);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = options.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        setActiveIndex((i) => n ? (i + 1) % n : -1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setOpen(true);
        setActiveIndex((i) => n ? i <= 0 ? n - 1 : i - 1 : -1);
        break;
      case 'Enter':
        if (open && activeIndex >= 0) {
          e.preventDefault();
          select(options[activeIndex]);
        }
        break;
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
        } else if (query) {
          setQueryState('');
        }
        break;
    }
  }

  return {
    query,
    setQuery: (value: string) => {
      setQueryState(value.slice(0, QUERY_MAX_LENGTH));
      setOpen(true);
    },
    term,
    open,
    setOpen,
    options,
    activeIndex,
    status,
    select,
    submit,
    onKeyDown,
    clearRecent: recent.clear
  };
}
