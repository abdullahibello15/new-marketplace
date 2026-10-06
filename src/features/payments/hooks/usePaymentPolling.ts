import { useCallback, useEffect, useRef, useState } from 'react';
import { PAYMENT_CONFIG } from '../config';
import { FINAL_PAYMENT_STATUSES } from '../constants';
import { getPaymentStatus } from '../services/paymentService';
import { useLatest } from './useLatest';
import type { Payment } from '../types';

/**
 * Polls a payment's status every PAYMENT_CONFIG.pollIntervalMs while waiting for a transfer or USSD
 * payment. Stops on its own when the status is final, when the payment has expired (after one last
 * check) or after pollMaxMinutes; pauses while the tab is hidden to save data and battery.
 * `checkNow` is the manual "Check again", which works whether or not polling is on.
 */
export function usePaymentPolling(payment: Payment | null, onUpdate: (p: Payment) => void) {
  const [polling, setPolling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const startedAt = useRef(0);
  const inFlight = useRef(false);
  const onUpdateRef = useLatest(onUpdate);
  const reference = payment?.reference ?? null;
  const expiresAt = payment?.expiresAt ?? null;
  const final = payment ? FINAL_PAYMENT_STATUSES.includes(payment.status) : true;

  const checkNow = useCallback(async () => {
    // One request at a time: on a slow connection, never stack up overlapping checks.
    if (!reference || inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      onUpdateRef.current(await getPaymentStatus(reference));
    } catch {
      // A failed check is retried on the next tick; the manual button shows it's still waiting.
    } finally {
      inFlight.current = false;
      setChecking(false);
      setLastCheckedAt(new Date());
    }
  }, [reference, onUpdateRef]);

  const start = useCallback(() => {
    startedAt.current = Date.now();
    setGaveUp(false);
    setPolling(true);
  }, []);
  const stop = useCallback(() => setPolling(false), []);

  // Stop conditions.
  useEffect(() => {
    if (polling && final) setPolling(false);
  }, [polling, final]);

  useEffect(() => {
    if (!polling) return;
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt.current > PAYMENT_CONFIG.pollMaxMinutes * 60_000) {
        setPolling(false);
        setGaveUp(true);
        return;
      }
      if (document.visibilityState !== 'visible') return;
      const expired = expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();
      void checkNow();
      // Past expiry, this was the last check: the server marks it Expired (or Paid if money landed just in time).
      if (expired) setPolling(false);
    }, PAYMENT_CONFIG.pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [polling, expiresAt, checkNow]);

  return { polling, checking, lastCheckedAt, gaveUp, start, stop, checkNow };
}
