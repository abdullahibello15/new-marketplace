import { CheckIcon, MinusIcon } from 'lucide-react';

/** Tick for included, dash for not included, or the value as text ("Unlimited"). */
export function PlanFeatureValue({ value }: {value: boolean | string;}) {
  if (typeof value === 'string') return <span className="font-bold text-ink">{value}</span>;
  return value ?
  <>
      <CheckIcon className="h-4 w-4 text-pine" aria-hidden="true" />
      <span className="sr-only">Included</span>
    </> :

  <>
      <MinusIcon className="h-4 w-4 text-muted/60" aria-hidden="true" />
      <span className="sr-only">Not included</span>
    </>;

}
