import { MinusIcon, PlusIcon } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (next: number) => void;
  /** Makes the button names unique in a list, e.g. "Increase Kitchen mixer tap". */
  itemName: string;
}

const stepButton =
'flex h-10 w-10 shrink-0 items-center justify-center text-ink transition-colors duration-150 hover:bg-sand focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pine/40 disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent';

/** −/+ for a cart line, from 1 up to the stock available. Removing is a separate button. */
export function QuantityStepper({ value, max, onChange, itemName }: QuantityStepperProps) {
  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-line bg-white" role="group" aria-label={`Quantity of ${itemName}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={`Decrease ${itemName}`} className={stepButton}>
        <MinusIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="w-10 text-center text-[15px] font-bold tabular-nums text-ink">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={value >= max ? `Increase ${itemName} (only ${max} in stock)` : `Increase ${itemName}`}
        className={stepButton}>

        <PlusIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>);

}
