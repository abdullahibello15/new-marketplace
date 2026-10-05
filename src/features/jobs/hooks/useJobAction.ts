import { useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import type { Job } from '../types';

/**
 * Runs one job action at a time with loading, success and error feedback. `busy` names the action in
 * flight so only its button spins. Resolves true on success, so dialogs know whether to close.
 */
export function useJobAction(onUpdated: (job: Job) => void) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<Job>, success: string | ((job: Job) => string)): Promise<boolean> {
    setBusy(key);
    try {
      const updated = await action();
      onUpdated(updated);
      toast.success(typeof success === 'function' ? success(updated) : success);
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
