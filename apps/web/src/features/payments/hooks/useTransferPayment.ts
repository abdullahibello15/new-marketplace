import { useEffect, useState } from 'react';
import { MOCK_PSP, SHOW_PAYMENT_SIMULATOR } from '../config';
import { PAYMENT_STATUS } from '../constants';
import { simulateIncomingTransfer } from '../services/mockPsp';
import { usePaymentPolling } from './usePaymentPolling';
import type { Payment } from '../types';

/** What the demo "bank" sends when the customer taps "I've sent the money". */
export type TransferSimulation = 'exact' | 'short' | 'extra' | 'nothing';

/**
 * Bank transfer: after "I've sent the money" we poll the payment until the transfer lands (or the
 * account expires). The server decides paid / short / extra from what actually arrived.
 */
export function useTransferPayment(payment: Payment | null, onUpdate: (p: Payment) => void) {
  const poll = usePaymentPolling(payment, onUpdate);
  const [simulation, setSimulation] = useState<TransferSimulation>('exact');
  const [claimedSent, setClaimedSent] = useState(false);
  const outstanding = payment ? Math.max(0, payment.amount - payment.amountReceived) : 0;
  const waiting = payment !== null && (payment.status === PAYMENT_STATUS.Pending || payment.status === PAYMENT_STATUS.Processing);

  const partlyPaid = payment !== null && payment.amountReceived > 0 && payment.status === PAYMENT_STATUS.Pending;
  const { stop } = poll;
  // A short transfer has landed: stop waiting so the customer can send the rest.
  useEffect(() => {
    if (partlyPaid) stop();
  }, [partlyPaid, payment?.amountReceived, stop]);

  function sent() {
    if (!payment) return;
    // MOCK: stands in for the customer's bank actually moving the money.
    if (SHOW_PAYMENT_SIMULATOR) {
      const amount = { exact: outstanding, short: outstanding - MOCK_PSP.testDifference, extra: outstanding + MOCK_PSP.testDifference, nothing: 0 }[simulation];
      simulateIncomingTransfer(payment.reference, amount);
    }
    setClaimedSent(true);
    poll.start();
  }

  return { poll, simulation, setSimulation, sent, claimedSent, outstanding, waiting, partlyPaid };
}
