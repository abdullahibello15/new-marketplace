import { useId } from 'react';
import { PAYMENT_METHOD_META } from '../constants';
import type { PaymentMethod } from '../types';

interface PaymentMethodSelectorProps {
  /** Only the methods that apply to this job or order. */
  methods: PaymentMethod[];
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
  /** Shown under the list when cash isn't offered, so customers know why. */
  note?: string | null;
}

/** Radio list of payment methods. Native radios: arrow keys work and screen readers announce the choice. */
export function PaymentMethodSelector({ methods, value, onChange, disabled = false, note }: PaymentMethodSelectorProps) {
  const name = useId();
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-bold text-muted">How would you like to pay?</legend>
      <div className="space-y-2">
        {methods.map((m) =>
        <label
          key={m}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-3 py-3 has-[:checked]:border-pine has-[:checked]:bg-[#E3EEEC] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pine/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">

            <input type="radio" name={name} value={m} checked={value === m} onChange={() => onChange(m)} className="mt-1 h-4 w-4 accent-pine" />
            <span>
              <span className="block font-bold text-ink">{PAYMENT_METHOD_META[m].label}</span>
              <span className="block text-sm text-muted">{PAYMENT_METHOD_META[m].description}</span>
            </span>
          </label>
        )}
      </div>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </fieldset>);

}
