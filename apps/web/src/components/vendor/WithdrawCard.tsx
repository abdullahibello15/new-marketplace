import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2Icon, Loader2Icon } from 'lucide-react';
import { vendorAccount } from '../../data/vendorPortal';
import { formatNaira } from '../../utils/format';

type State = 'idle' | 'confirm' | 'sending' | 'done';

export function WithdrawCard() {
  const [state, setState] = useState<State>('idle');
  const [balance, setBalance] = useState(vendorAccount.availableBalance);
  const [withdrawn, setWithdrawn] = useState(0);

  function confirm() {
    setState('sending');
    window.setTimeout(() => {
      setWithdrawn(balance);
      setBalance(0);
      setState('done');
    }, 800);
  }

  return (
    <div className="rounded-2xl bg-pine-deep p-5 text-white">
      <p className="text-sm font-semibold text-white/75">Available to withdraw</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight">{formatNaira(balance)}</p>
      <p className="mt-1 text-sm text-white/75">
        Auto-payout {format(new Date(vendorAccount.nextPayout), 'EEE d MMM')} to {vendorAccount.payoutAccount}
      </p>

      {state === 'idle' &&
      <button
        type="button"
        onClick={() => setState('confirm')}
        disabled={balance === 0}
        className="mt-5 w-full rounded-xl bg-mustard px-4 py-3 text-[15px] font-bold text-ink transition-[filter,transform] duration-150 ease-out hover:brightness-105 active:scale-[0.98] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        
          Withdraw now
        </button>
      }

      {(state === 'confirm' || state === 'sending') &&
      <div className="mt-5 rounded-xl bg-white/10 p-4">
          <p className="text-sm font-semibold">
            Send {formatNaira(balance)} to {vendorAccount.payoutAccount}?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
            type="button"
            onClick={() => setState('idle')}
            disabled={state === 'sending'}
            className="rounded-lg bg-white/10 px-3 py-2.5 text-sm font-bold transition-colors duration-150 hover:bg-white/20 disabled:opacity-50">
            
              Cancel
            </button>
            <button
            type="button"
            onClick={confirm}
            disabled={state === 'sending'}
            className="flex items-center justify-center gap-2 rounded-lg bg-mustard px-3 py-2.5 text-sm font-bold text-ink disabled:cursor-wait">
            
              {state === 'sending' && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {state === 'sending' ? 'Sending…' : 'Confirm'}
            </button>
          </div>
        </div>
      }

      {state === 'done' &&
      <div role="status" className="mt-5 flex items-start gap-2.5 rounded-xl bg-white/10 p-4 text-sm">
          <CheckCircle2Icon className="mt-0.5 h-5 w-5 shrink-0 text-mustard" aria-hidden="true" />
          <p>
            <strong className="font-bold">{formatNaira(withdrawn)} on its way.</strong> Usually lands within 30 minutes.
          </p>
        </div>
      }
    </div>);

}