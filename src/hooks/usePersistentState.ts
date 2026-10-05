import { useCallback, useState } from 'react';

function read<T>(key: string, fallback: T, parse: (raw: unknown) => T | null): T {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return fallback;
    return parse(JSON.parse(stored)) ?? fallback;
  } catch {
    // Blocked storage (private mode) or corrupt JSON: start from the default.
    return fallback;
  }
}

/**
 * useState that survives reloads via localStorage. `parse` validates what comes back from storage,
 * since it may be stale, edited by hand or from an older version of the app; return null to reject it.
 */
export function usePersistentState<T>(key: string, fallback: T, parse: (raw: unknown) => T | null) {
  const [value, setValue] = useState<T>(() => read(key, fallback, parse));

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage full or blocked: keep working in memory for this session.
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, update] as const;
}
