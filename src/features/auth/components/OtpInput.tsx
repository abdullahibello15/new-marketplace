import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { OTP } from '../constants';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when all digits are filled (typed, pasted or autofilled). */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Visible label above the boxes, for screen readers too. */
  label: string;
  describedBy?: string;
}

/**
 * A one-time code as separate digit boxes: typing moves to the next box, Backspace goes back, a pasted
 * code fills them all, and the first box has autocomplete="one-time-code" so Android and iOS can fill
 * the code from the SMS.
 */
export function OtpInput({ value, onChange, onComplete, disabled, invalid, label, describedBy }: OtpInputProps) {
  const { t } = useTranslation('auth');
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP.length }, (_, i) => value[i] ?? '');

  function set(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, OTP.length);
    onChange(clean);
    if (clean.length === OTP.length) onComplete?.(clean);
    return clean;
  }

  function typeAt(i: number, raw: string) {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;
    // Several digits at once (autofill or a fast typist): fill from here.
    const next = (value.slice(0, i) + typed).slice(0, OTP.length);
    const clean = set(next);
    refs.current[Math.min(clean.length, OTP.length - 1)]?.focus();
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) set(value.slice(0, i) + value.slice(i + 1));else
      if (i > 0) {
        set(value.slice(0, i - 1) + value.slice(i));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();else
    if (e.key === 'ArrowRight' && i < OTP.length - 1) refs.current[i + 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const clean = set(e.clipboardData.getData('text'));
    refs.current[Math.min(clean.length, OTP.length - 1)]?.focus();
  }

  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="mb-2 text-sm font-bold text-muted">{label}</legend>
      <div className="flex gap-2">
        {digits.map((d, i) =>
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => typeAt(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? OTP.length : 1}
          disabled={disabled}
          aria-label={t('otp.digit', { n: i + 1, total: OTP.length })}
          aria-invalid={invalid || undefined}
          className={`h-14 w-11 rounded-xl border bg-white text-center text-2xl font-bold tabular-nums text-ink focus:outline-none focus:ring-2 disabled:opacity-60 sm:w-12 ${
          invalid ? 'border-clay focus:ring-clay/20' : 'border-line focus:border-pine focus:ring-pine/20'}`
          } />

        )}
      </div>
    </fieldset>);

}
