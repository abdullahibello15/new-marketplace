import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../lib/errors';

export type AsyncStatus = 'loading' | 'success' | 'error';

interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

/**
 * Loads data from a service and tracks loading/error state. `load` must be stable (a module-level
 * service function, or wrapped in useCallback) or it will refetch on every render.
 * `setData` applies a local update after a successful mutation without refetching.
 */
export function useAsyncData<T>(load: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    load().then(
      (data) => {
        if (!cancelled) setState({ status: 'success', data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'error', data: null, error: errorMessage(error) });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const setData = useCallback((update: (prev: T) => T) => {
    setState((prev) => prev.data === null ? prev : { ...prev, data: update(prev.data) });
  }, []);

  return { ...state, reload, setData };
}
