import { Trans, useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { AUTH_ROUTES, PASSWORD } from '../constants';
import { errorMessage } from '../errors';
import { requestPasswordReset, resetPassword } from '../services/accountService';
import { PasswordInput } from '../components/PasswordInput';

/** /login/forgot — always says the same thing, so nobody can tell whether an email has an account. */
export function ForgotPasswordSection() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setError(t('forgot.enterEmail'));
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('forgot.title')}</h1>
      {sent ?
      <p role="status" className="rounded-xl bg-[#E3EEEC] px-4 py-3 text-sm">
          <Trans t={t} i18nKey="forgot.sent" values={{ email }} components={{ strong: <strong /> }} />
        </p> :

      <form noValidate onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted">{t('forgot.intro')}</p>
          <div>
            <label htmlFor="forgot-email" className={labelClass}>{t('email.label')}</label>
            <input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${field} ${ok}`} />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-clay-dark">{error}</p>}
          <Button type="submit" fullWidth loading={busy}>{t('forgot.send')}</Button>
        </form>
      }
      <Link to={AUTH_ROUTES.login} className="block text-center text-sm font-semibold text-pine underline underline-offset-2">{t('forgot.backToSignIn')}</Link>
    </div>);

}

/** /reset-password/:token — the link from the reset email. */
export function ResetPasswordSection() {
  const { t } = useTranslation('auth');
  const { token = '' } = useParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < PASSWORD.minLength) return setError(t('reset.minLength', { min: PASSWORD.minLength }));
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t('reset.title')}</h1>
      {done ?
      <>
          <p role="status" className="rounded-xl bg-[#E3EEEC] px-4 py-3 text-sm">{t('reset.done')}</p>
          <Link to={AUTH_ROUTES.login} className="block text-center font-bold text-pine underline">{t('reset.signIn')}</Link>
        </> :

      <form noValidate onSubmit={submit} className="space-y-4">
          <PasswordInput value={password} onChange={setPassword} label={t('reset.newPassword')} autoComplete="new-password" showStrength autoFocus />
          {error && <p role="alert" className="text-sm font-medium text-clay-dark">{error}</p>}
          <Button type="submit" fullWidth loading={busy}>{t('reset.save')}</Button>
        </form>
      }
    </div>);

}
