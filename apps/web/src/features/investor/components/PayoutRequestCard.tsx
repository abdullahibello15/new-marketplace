import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HourglassIcon, WalletIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Price } from '../../../components/ui/Price';
import { formatNaira } from '../../../utils/format';
import { DIVIDEND_RULES } from '../config';
import { INVESTOR_ROUTES } from '../constants';
import type { InvestorBalances } from '../types';

interface PayoutRequestCardProps {
  balances: InvestorBalances;
  payoutAccount: string;
  hasPending: boolean;
  busy: boolean;
  onRequest: () => Promise<boolean>;
}

/** Request the available dividends: confirm first, then it waits as Pending until approved. */
export function PayoutRequestCard({ balances: b, payoutAccount, hasPending, busy, onRequest }: PayoutRequestCardProps) {
  const [confirming, setConfirming] = useState(false);
  const blocked = hasPending ?
  'You already have a payout waiting for approval.' :
  b.requestable < DIVIDEND_RULES.minimumPayout ?
  `The minimum payout is ${formatNaira(DIVIDEND_RULES.minimumPayout)}.` :
  null;

  return (
    <section aria-labelledby="payout-heading" className="rounded-2xl bg-pine-deep p-4 text-white lg:p-5">
      <h2 id="payout-heading" className="flex items-center gap-2 text-sm font-semibold text-white/75">
        <WalletIcon className="h-4 w-4" aria-hidden="true" />
        Dividends available
      </h2>
      <Price amount={b.available} className="mt-1 block text-3xl font-extrabold" />
      <p className="mt-1 text-sm text-white/75">Paid to {payoutAccount}</p>

      {b.pending > 0 &&
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm" role="status">
          <HourglassIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {formatNaira(b.pending)} pending approval.{' '}
            <Link to={INVESTOR_ROUTES.payouts} className="font-bold underline">
              See status
            </Link>
          </span>
        </p>
      }

      <Button variant="highlight" fullWidth className="mt-4" onClick={() => setConfirming(true)} disabled={blocked !== null} aria-describedby={blocked ? 'payout-blocked' : undefined}>
        Request payout{b.requestable > 0 && !hasPending ? ` of ${formatNaira(b.requestable)}` : ''}
      </Button>
      {blocked && <p id="payout-blocked" className="mt-2 text-xs text-white/75">{blocked}</p>}
      <p className="mt-2 text-xs text-white/60">Minimum {formatNaira(DIVIDEND_RULES.minimumPayout)}. Payouts are checked and approved by Gwani before they’re sent.</p>

      <ConfirmDialog
        open={confirming}
        title={`Request a payout of ${formatNaira(b.requestable)}?`}
        description={`Your available dividends will be paid to ${payoutAccount} once Gwani approves the request. It shows as pending until then. This is a demo: no real money moves.`}
        confirmLabel="Request payout"
        loading={busy}
        onConfirm={async () => {
          if (await onRequest()) setConfirming(false);
        }}
        onCancel={() => setConfirming(false)} />

    </section>);

}
