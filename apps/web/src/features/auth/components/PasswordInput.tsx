import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { bad, field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { PASSWORD } from '../constants';
import { passwordStrength } from '../utils/password';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  autoComplete: 'current-password' | 'new-password';
  /** New passwords: show the minimum length and the strength meter. */
  showStrength?: boolean;
  error?: string | null;
  autoFocus?: boolean;
}

const BAR = ['bg-line', 'bg-clay', 'bg-mustard', 'bg-pine/70', 'bg-pine'];

/** A password field with show/hide and, for new passwords, a strength meter. */
export function PasswordInput({ value, onChange, label, autoComplete, showStrength = false, error, autoFocus }: PasswordInputProps) {
  const { t } = useTranslation('auth');
  const id = useId();
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label ?? t('password.label')}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          value={value}
          maxLength={PASSWORD.maxLength}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error || undefined}
          aria-describedby={showStrength ? `${id}-strength` : undefined}
          className={`${field} ${error ? bad : ok} pr-12`} />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('password.hide') : t('password.show')}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

          {visible ? <EyeOffIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      {showStrength &&
      <div id={`${id}-strength`} className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${strength.score >= n ? BAR[strength.score] : 'bg-line'}`} />)}
          </div>
          <p className="mt-1 text-xs text-muted">
            {value ? `${t('password.strengthLine', { label: t(`password.strength.${strength.label}`) })} ` : ''}
            {t('password.rules', { min: PASSWORD.minLength })}
          </p>
        </div>
      }
      {error && <p role="alert" className="mt-1 text-sm font-medium text-clay-dark">{error}</p>}
    </div>);

}
