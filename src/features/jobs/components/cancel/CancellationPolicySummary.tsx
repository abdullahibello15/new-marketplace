import { ShieldCheckIcon } from 'lucide-react';
import { CANCELLATION_POLICY, cancellationPolicyLines } from '../../cancellationPolicy';

/**
 * The cancellation policy in a few lines, from the policy config. Collapsed to one line until opened,
 * so it fits on the request form and the quote card.
 */
export function CancellationPolicySummary({ className = '' }: {className?: string;}) {
  return (
    <details className={`group rounded-xl bg-sand px-3 py-2 text-sm ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded font-semibold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
        <ShieldCheckIcon className="h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
        <span className="flex-1">Free cancellation up to {CANCELLATION_POLICY.freeCancellationHours} hours before</span>
        <span className="text-xs font-bold text-pine group-open:hidden">Policy</span>
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-muted">
        {cancellationPolicyLines().map((line) =>
        <li key={line}>{line}</li>
        )}
      </ul>
    </details>);

}
