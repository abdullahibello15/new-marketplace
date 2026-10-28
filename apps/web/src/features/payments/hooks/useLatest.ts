import { useEffect, useRef } from 'react';

/** A ref that always holds the latest value, so timers and async callbacks can call it without restarting. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
