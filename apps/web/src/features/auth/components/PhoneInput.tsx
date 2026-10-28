import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { field, label as labelClass, ok, bad } from '../../../components/vendor/formStyles';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
  label?: string;
  autoFocus?: boolean;
}

/** A Nigerian mobile number: 0803…, +234 803… or 803…; checked and normalised to +234 by utils/phone. */
export function PhoneInput({ value, onChange, error, disabled, readOnly, label, autoFocus }: PhoneInputProps) {
  const { t } = useTranslation('auth');
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label ?? t('phone.label')}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-muted" aria-hidden="true">🇳🇬</span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          autoFocus={autoFocus}
          placeholder={t('phone.placeholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={!!error || undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          className={`${field} ${error ? bad : ok} pl-12 ${readOnly ? 'bg-sand' : ''}`} />

      </div>
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{t('phone.hint')}</p>
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-medium text-clay-dark">{error}</p>}
    </div>);

}
