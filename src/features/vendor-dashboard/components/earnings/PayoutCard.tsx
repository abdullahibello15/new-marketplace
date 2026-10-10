import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { vendorAccount } from '../../../../data/vendorPortal';
import { formatDate, formatNaira } from '../../../../utils/format';

interface PayoutCardProps {
  available: number;
  pending: number;
  busy: boolean;
  onWithdraw: () => Promise<boolean>;
}

/** Available balance (released from escrow) with "Withdraw now"; what's still held is shown underneath. */
export function PayoutCard({ available, pending, busy, onWithdraw }: PayoutCardProps) {
  const { t } = useTranslation('vendor');
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-2xl bg-pine-deep p-5 text-white">
      <p className="text-sm font-semibold text-white/75">{t('earnings.availableToWithdraw')}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{formatNaira(available)}</p>
      <p className="mt-1 text-sm text-white/75">
        {t('earnings.autoPayout', { date: formatDate(vendorAccount.nextPayout, 'EEE d MMM'), account: vendorAccount.payoutAccount })}
      </p>
      <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/85">
        {t('earnings.heldMore', { amount: formatNaira(pending) })}
      </p>
      <Button variant="highlight" fullWidth className="mt-4" disabled={available === 0} loading={busy} onClick={() => setConfirming(true)}>
        {t('earnings.withdrawNow')}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={t('earnings.withdrawTitle', { amount: formatNaira(available) })}
        description={t('earnings.withdrawText', { account: vendorAccount.payoutAccount })}
        confirmLabel={t('earnings.withdraw')}
        cancelLabel={t('earnings.notNow')}
        loading={busy}
        onConfirm={async () => {
          if (await onWithdraw()) setConfirming(false);
        }}
        onCancel={() => setConfirming(false)} />

    </div>);

}
