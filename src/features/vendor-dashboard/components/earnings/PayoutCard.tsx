import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { vendorAccount } from '../../../../data/vendorPortal';
import { formatNaira } from '../../../../utils/format';

interface PayoutCardProps {
  available: number;
  pending: number;
  busy: boolean;
  onWithdraw: () => Promise<boolean>;
}

/** Available balance (released from escrow) with "Withdraw now"; what's still held is shown underneath. */
export function PayoutCard({ available, pending, busy, onWithdraw }: PayoutCardProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-2xl bg-pine-deep p-5 text-white">
      <p className="text-sm font-semibold text-white/75">Available to withdraw</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{formatNaira(available)}</p>
      <p className="mt-1 text-sm text-white/75">
        Auto-payout {format(new Date(vendorAccount.nextPayout), 'EEE d MMM')} to {vendorAccount.payoutAccount}
      </p>
      <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/85">
        {formatNaira(pending)} more is held in escrow and becomes available when customers confirm.
      </p>
      <Button variant="highlight" fullWidth className="mt-4" disabled={available === 0} loading={busy} onClick={() => setConfirming(true)}>
        Withdraw now
      </Button>
      <ConfirmDialog
        open={confirming}
        title={`Withdraw ${formatNaira(available)}?`}
        description={`It goes to ${vendorAccount.payoutAccount} and usually lands within 30 minutes (demo: nothing is really sent).`}
        confirmLabel="Withdraw"
        cancelLabel="Not now"
        loading={busy}
        onConfirm={async () => {
          if (await onWithdraw()) setConfirming(false);
        }}
        onCancel={() => setConfirming(false)} />

    </div>);

}
