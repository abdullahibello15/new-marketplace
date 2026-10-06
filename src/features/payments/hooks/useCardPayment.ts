import { useCallback, useEffect, useRef, useState } from 'react';
import { PAYMENT_CONFIG } from '../config';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../constants';
import { verifyPayment } from '../services/paymentService';
import { useLatest } from './useLatest';
import type { Payment, PaymentInitiation, PaymentMethodChoice } from '../types';

/** Where the card flow is. "closed" and "timeout" mean we verified and nothing was charged (yet). */
export type CardStage = 'idle' | 'starting' | 'popup' | 'verifying' | 'paid' | 'failed' | 'closed' | 'timeout';

const BUSY: CardStage[] = ['starting', 'popup', 'verifying'];

/**
 * Card payment via the PSP's hosted checkout. We never see card details: we open the provider's page,
 * and when it returns (paid, declined, closed by the customer, or timed out) we ask the server to
 * verify the reference. Only a verified Paid counts as success.
 */
export function useCardPayment(initiate: (choice: PaymentMethodChoice) => Promise<PaymentInitiation | null>, onPayment: (p: Payment) => void) {
  const [stage, setStage] = useState<CardStage>('idle');
  const [reference, setReference] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);
  const onPaymentRef = useLatest(onPayment);

  const verify = useCallback(
    async (ref: string, ifStillPending: 'closed' | 'timeout') => {
      setStage('verifying');
      try {
        const p = await verifyPayment(ref);
        onPaymentRef.current(p);
        if (p.status === PAYMENT_STATUS.Paid) setStage('paid');else
        if (p.status === PAYMENT_STATUS.Failed || p.status === PAYMENT_STATUS.Expired) {
          setMessage(p.outcome);
          setStage('failed');
        } else setStage(ifStillPending);
      } catch {
        setMessage(null);
        setStage('timeout');
      } finally {
        busy.current = false;
      }
    },
    [onPaymentRef]
  );

  /** "Pay with card": start (or reuse) the payment, then open the hosted page. Ignored while one is running. */
  const pay = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setMessage(null);
    setStage('starting');
    const result = await initiate({ method: PAYMENT_METHOD.Card });
    if (!result) {
      busy.current = false;
      setStage('idle');
      return;
    }
    setReference(result.payment.reference);
    setCheckoutUrl(result.authorizationUrl);
    setStage('popup');
  }, [initiate]);

  // The hosted page has to come back within the timeout, or we stop waiting and verify.
  useEffect(() => {
    if (stage !== 'popup' || !reference) return;
    const timer = window.setTimeout(() => void verify(reference, 'timeout'), PAYMENT_CONFIG.cardPopupTimeoutSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [stage, reference, verify]);

  return {
    stage,
    message,
    checkoutUrl,
    reference,
    busy: BUSY.includes(stage),
    pay,
    /** The hosted page redirected back (paid or declined). */
    onReturn: () => reference && void verify(reference, 'timeout'),
    /** The customer closed the popup themselves. */
    onClosed: () => reference && void verify(reference, 'closed'),
    /** "No response" from the hosted page (also what the timer triggers). */
    onTimeout: () => reference && void verify(reference, 'timeout'),
    checkAgain: () => reference && void verify(reference, stage === 'closed' ? 'closed' : 'timeout')
  };
}
