import { useEffect, useState } from 'react';
import { NIGERIAN_BANKS } from '../../../data/nigerianBanks';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../constants';
import { simulateUssdResponse } from '../services/mockPsp';
import { usePaymentPolling } from './usePaymentPolling';
import type { Payment } from '../types';

export type UssdSimulation = 'approve' | 'decline';

/**
 * USSD: the customer dials a code on their phone (outside the app), so we start polling as soon as the
 * code is shown and keep going until it's paid, declined or expired.
 */
export function useUssdPayment(payment: Payment | null, onUpdate: (p: Payment) => void) {
  const poll = usePaymentPolling(payment, onUpdate);
  const [bankId, setBankId] = useState(payment?.ussd?.bankId ?? NIGERIAN_BANKS[0].id);
  const [simulation, setSimulation] = useState<UssdSimulation>('approve');
  const active = payment !== null && payment.method === PAYMENT_METHOD.Ussd && (payment.status === PAYMENT_STATUS.Pending || payment.status === PAYMENT_STATUS.Processing);
  const reference = payment?.reference;
  const { start } = poll;

  useEffect(() => {
    if (active && reference) start();
  }, [active, reference, start]);

  /** MOCK: what the customer does on their phone's USSD screen. */
  function simulate() {
    if (!payment) return;
    simulateUssdResponse(payment.reference, simulation === 'approve');
    start();
  }

  return { poll, bankId, setBankId, simulation, setSimulation, simulate, active };
}
