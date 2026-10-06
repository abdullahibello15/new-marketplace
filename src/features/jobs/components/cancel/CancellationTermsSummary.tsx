import { TriangleAlertIcon } from 'lucide-react';
import { Price } from '../../../../components/ui/Price';
import type { CancellationTerms } from '../../cancellationPolicy';

/** The part of the policy that applies to this cancellation, with the fee if there is one. */
export function CancellationTermsSummary({ terms }: {terms: CancellationTerms;}) {
  return (
    <div className="space-y-2 rounded-xl bg-sand p-3 text-sm">
      <p className="text-ink">{terms.summary}</p>
      {terms.warning &&
      <p className="flex items-start gap-2 font-semibold text-clay-dark">
          <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {terms.warning}
        </p>
      }
      <p className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-2">
        <span className="font-semibold text-muted">Cancellation fee</span>
        {terms.fee > 0 ?
        <span className="text-right">
            <Price amount={terms.fee} className="font-bold text-ink" />
            <span className="block text-xs text-muted">Demo only: no money is charged.</span>
          </span> :

        <span className="font-bold text-pine">Free</span>
        }
      </p>
    </div>);

}
