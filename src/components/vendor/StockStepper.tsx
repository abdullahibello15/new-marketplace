import React, { useId } from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { errorText } from './formStyles';
import { useQuantityDraft } from '../../hooks/useQuantityDraft';

interface StockStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Used to make the label and button names unique in a list. */
  productName: string;
}

const stepButton =
'flex h-10 w-10 shrink-0 items-center justify-center text-ink transition-colors duration-150 hover:bg-sand focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pine/40 disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent';

/** −/+ buttons and an exact-number field. Typed values save on Enter or when the field loses focus; Esc undoes. */
export function StockStepper({ value, onChange, productName }: StockStepperProps) {
  const uid = useId();
  const inputId = `${uid}-stock`;
  const errorId = `${uid}-stock-error`;
  const q = useQuantityDraft(value, onChange);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      q.commit();
    } else if (e.key === 'Escape') {
      q.revert();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      q.step(e.key === 'ArrowUp' ? 1 : -1);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="text-sm font-bold text-muted">
          Stock<span className="sr-only"> for {productName}</span>
        </label>
        <div
          className={`flex items-center overflow-hidden rounded-xl border bg-white ${q.error ? 'border-clay' : 'border-line'}`}>

          <button
            type="button"
            onClick={() => q.step(-1)}
            disabled={!q.canDecrease}
            aria-label={`Decrease stock of ${productName}`}
            className={stepButton}>

            <MinusIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={q.draft}
            onChange={(e) => q.change(e.target.value)}
            onBlur={q.commit}
            onKeyDown={handleKeyDown}
            aria-invalid={Boolean(q.error)}
            aria-describedby={q.error ? errorId : undefined}
            className="h-10 w-16 border-x border-line bg-white text-center text-[15px] font-bold tabular-nums text-ink focus:outline-none focus:ring-2 focus:ring-inset focus:ring-pine/30" />

          <button
            type="button"
            onClick={() => q.step(1)}
            disabled={!q.canIncrease}
            aria-label={`Increase stock of ${productName}`}
            className={stepButton}>

            <PlusIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {q.error &&
      <p id={errorId} className={errorText}>
          {q.error} Not saved.
        </p>
      }
      <span className="sr-only" aria-live="polite">
        {productName}: {value.toLocaleString('en-NG')} in stock
      </span>
    </div>);

}
