import { useEffect, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { formatNaira } from '../../../utils/format';
import { PAYOUT_REQUEST_STATUS } from '../constants';
import { approvePayoutNow, getInvestorDashboard, requestPayout } from '../services/investorService';

/** While a payout waits for approval, check again this often so the status updates by itself. */
const PENDING_POLL_MS = 5000;

/** The investor's dashboard data, plus requesting a payout (and the demo approval). */
export function useInvestorDashboard() {
  const toast = useToast();
  const dashboard = useAsyncData(getInvestorDashboard);
  const [busy, setBusy] = useState<'request' | 'approve' | null>(null);
  const { reload } = dashboard;
  const hasPending = dashboard.data?.payoutRequests.some((r) => r.status === PAYOUT_REQUEST_STATUS.Pending) ?? false;

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(reload, PENDING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [hasPending, reload]);

  async function run(kind: 'request' | 'approve', task: () => Promise<string>): Promise<boolean> {
    if (busy) return false;
    setBusy(kind);
    try {
      toast.success(await task());
      reload();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  return {
    ...dashboard,
    busy,
    hasPending,
    requestPayout: () => run('request', async () => `Payout of ${formatNaira((await requestPayout()).amount)} requested. It’s pending approval.`),
    approveNow: (id: string) => run('approve', async () => {
      await approvePayoutNow(id);
      return 'Payout approved (demo).';
    })
  };
}
