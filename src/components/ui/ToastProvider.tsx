import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2Icon, AlertCircleIcon, XIcon } from 'lucide-react';
import { ToastContext, type Toast, type ToastApi, type ToastTone } from './toastContext';

const TOAST_DURATION_MS = 4500;
const MAX_TOASTS = 3;

/**
 * Renders toasts in two live regions: errors interrupt screen readers (assertive), successes wait
 * their turn (polite). Sits above the mobile bottom nav.
 */
export function ToastProvider({ children }: {children: React.ReactNode;}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, message }].slice(-MAX_TOASTS));
      timers.current.set(id, window.setTimeout(() => dismiss(id), TOAST_DURATION_MS));
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push]
  );

  const region = (tone: ToastTone) =>
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    aria-live={tone === 'error' ? 'assertive' : 'polite'}
    className="flex flex-col gap-2">

      {toasts.
    filter((t) => t.tone === tone).
    map((t) =>
    <div
      key={t.id}
      className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
      tone === 'error' ? 'bg-clay-dark text-white' : 'bg-pine-deep text-white'}`
      }>

            {tone === 'error' ?
      <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> :

      <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-mustard" aria-hidden="true" />
      }
            <p className="min-w-0 flex-1">{t.message}</p>
            <button
        type="button"
        onClick={() => dismiss(t.id)}
        aria-label="Dismiss"
        className="-m-1 rounded p-1 text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">

              <XIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
    )}
    </div>;


  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-6 lg:pl-64">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {region('error')}
          {region('success')}
        </div>
      </div>
    </ToastContext.Provider>);

}
