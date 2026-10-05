import React from 'react';
import { errorText, label as labelClass } from '../vendor/formStyles';

interface FormFieldProps {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  /** Rendered on the right of the label row, e.g. a character counter. */
  aside?: React.ReactNode;
  /** Receives the aria-describedby value to put on the control. */
  children: (describedBy: string | undefined) => React.ReactNode;
}

/** Label, hint and error wiring for one form control. Error text is linked to the control for screen readers. */
export function FormField({ id, label, hint, error, aside, children }: FormFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelClass}>{label}</label>
        {aside}
      </div>
      {children(describedBy)}
      {hint && <p id={hintId} className="mt-1.5 text-sm text-muted">{hint}</p>}
      {error && <p id={errorId} className={errorText}>{error}</p>}
    </div>);

}
