import { useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import type { Order } from '../types';

/**
 * Runs one order action at a time with loading, success and error feedback (same pattern as jobs).
 * `busy` names the action in flight so only its button spins. Resolves true on success.
 */
export function useOrderAction(onUpdated: (order: Order) => void) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<Order>, success: string): Promise<boolean> {
    setBusy(key);
    try {
      onUpdated(await action());
      toast.success(success);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  return { busy, run };
}
