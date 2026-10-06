import { CheckIcon, CopyIcon } from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface CopyFieldProps {
  label: string;
  /** What's shown, e.g. "₦12,500" or "*737*000*4821#". */
  display: string;
  /** What's copied, e.g. "12500". Defaults to `display`. */
  copyValue?: string;
  large?: boolean;
}

/** A value the customer needs to type elsewhere (account number, amount, USSD code), with a copy button. */
export function CopyField({ label, display, copyValue, large = false }: CopyFieldProps) {
  const { copy, copied } = useCopyToClipboard();
  const done = copied === label;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className={`select-all break-all font-mono font-bold tabular-nums text-ink ${large ? 'text-2xl' : 'text-lg'}`}>{display}</p>
      </div>
      <button
        type="button"
        onClick={() => void copy(copyValue ?? display, label)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sand px-3 py-2 text-sm font-bold text-ink hover:bg-line focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

        {done ? <CheckIcon className="h-4 w-4 text-pine" aria-hidden="true" /> : <CopyIcon className="h-4 w-4" aria-hidden="true" />}
        {done ? 'Copied' : 'Copy'}
        <span className="sr-only"> {label.toLowerCase()}</span>
      </button>
    </div>);

}
