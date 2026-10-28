import { useEffect, useState } from 'react';
import { PRODUCT_STOCK_MAX, clampStock, parseStock, quantityError } from '../utils/products';

/**
 * Typed-quantity state for a stock stepper. The text field keeps what the vendor typed until it is
 * committed (Enter or blur); invalid text shows an error and is never saved.
 */
export function useQuantityDraft(value: number, onCommit: (next: number) => void) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  // Follow outside changes (+/- buttons, undo, edits elsewhere).
  useEffect(() => {
    setDraft(String(value));
    setError(null);
  }, [value]);

  function change(next: string) {
    setDraft(next);
    if (error) setError(null);
  }

  function commit() {
    const message = quantityError(draft);
    const parsed = parseStock(draft);
    if (message || parsed === null) {
      setError(message ?? 'Stock must be a whole number, like 12.');
      return;
    }
    if (parsed === value) setDraft(String(value));else
    onCommit(parsed);
  }

  function revert() {
    setDraft(String(value));
    setError(null);
  }

  function step(delta: number) {
    const next = clampStock(value + delta);
    if (next !== value) onCommit(next);else
    revert();
  }

  return {
    draft,
    error,
    change,
    commit,
    revert,
    step,
    canDecrease: value > 0,
    canIncrease: value < PRODUCT_STOCK_MAX
  };
}
