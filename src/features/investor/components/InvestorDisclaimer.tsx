import { InfoIcon } from 'lucide-react';
import { INVESTOR_DISCLAIMER } from '../constants';

/** Shown at the top of every investor page. */
export function InvestorDisclaimer() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-4 lg:px-10 print:hidden">
      <p role="note" className="flex items-start gap-2 rounded-xl border border-mustard/50 bg-[#FBF3DC] px-3 py-2 text-xs font-medium text-ink">
        <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mustard-dark" aria-hidden="true" />
        <span>
          <strong>Not financial advice.</strong> {INVESTOR_DISCLAIMER}
        </span>
      </p>
    </div>);

}
