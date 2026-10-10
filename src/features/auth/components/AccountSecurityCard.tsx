import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { MailCheckIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { useToast } from '../../../hooks/useToast';
import { EMAIL_CODE, PASSWORD, ROLE } from '../constants';
import { errorMessage } from '../errors';
import { useAuth } from '../hooks/useAuth';
import { addEmail, setPassword, verifyEmail } from '../services/accountService';
import { PasswordInput } from './PasswordInput';

/**
 * Optional email for customers: add it, verify it with a code (MOCK: shown in the dev banner), then set a
 * password to sign in with it. Phone + code stays the main way in. Vendors, riders and staff keep phone only.
 */
export function AccountSecurityCard() {
  const { t } = useTranslation('auth');
  const { user } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPasswordValue] = useState('');
  const [busy, setBusy] = useState<'email' | 'code' | 'password' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  if (!user) return null;
  const customerOnly = user.roles.length === 1 && user.roles[0] === ROLE.Customer;

  async function run(kind: 'email' | 'code' | 'password', action: () => Promise<unknown>, done: string) {
    setBusy(kind);
    setError(null);
    try {
      await action();
      toast.success(done);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  const sendEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (await run('email', () => addEmail(email), t('security.toast.codeSent', { length: EMAIL_CODE.length, email }))) {
      setEditing(false);
      setCode('');
    }
  };

  return (
    <section aria-labelledby="security-heading" className="rounded-2xl border border-line bg-white p-4 lg:max-w-2xl lg:p-5">
      <h2 id="security-heading" className="flex items-center gap-2 font-bold"><MailCheckIcon className="h-5 w-5 shrink-0 text-pine" aria-hidden="true" />{t('security.title')} <span className="text-xs font-normal text-muted">({t('common:state.optional')})</span></h2>
      <p className="mt-1 text-sm text-muted">{customerOnly ? t('security.introCustomer') : t('security.intro')}</p>

      {user.email && !editing ?
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{user.email}</span>
          <Badge tone={user.emailVerified ? 'success' : 'warning'}>{user.emailVerified ? t('security.verified') : t('security.notVerified')}</Badge>
          <button type="button" onClick={() => setEditing(true)} className="font-semibold text-pine underline underline-offset-2">{t('common:action.change')}</button>
        </div> :

      <form noValidate onSubmit={sendEmail} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="sec-email" className={labelClass}>{t('email.label')}</label>
            <input id="sec-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${field} ${ok}`} />
          </div>
          <Button type="submit" loading={busy === 'email'}>{t('security.sendCode')}</Button>
          {user.email && <Button variant="ghost" onClick={() => setEditing(false)}>{t('common:action.cancel')}</Button>}
        </form>
      }

      {user.email && !user.emailVerified && !editing &&
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void run('code', () => verifyEmail(code), t('security.toast.verified'));
        }}
        className="mt-3 flex flex-wrap items-end gap-2">

          <div>
            <label htmlFor="sec-code" className={labelClass}>{t('security.codeLabel')}</label>
            <input id="sec-code" inputMode="numeric" autoComplete="one-time-code" maxLength={EMAIL_CODE.length} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className={`${field} ${ok} w-40`} />
          </div>
          <Button type="submit" loading={busy === 'code'} disabled={code.length !== EMAIL_CODE.length}>{t('security.verify')}</Button>
          <Button variant="ghost" onClick={() => void run('email', () => addEmail(user.email as string), t('security.toast.newCode'))}>{t('security.resend')}</Button>
        </form>
      }

      {user.email && user.emailVerified && customerOnly &&
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void run('password', () => setPassword(password), user.hasPassword ? t('security.toast.passwordChanged') : t('security.toast.passwordSet')).then((okay) => okay && setPasswordValue(''));
        }}
        className="mt-4 space-y-3 border-t border-line pt-4">

          <PasswordInput value={password} onChange={setPasswordValue} label={user.hasPassword ? t('security.newPassword') : t('security.setPassword')} autoComplete="new-password" showStrength />
          <Button type="submit" loading={busy === 'password'} disabled={password.length < PASSWORD.minLength}>{user.hasPassword ? t('security.changePassword') : t('security.setPasswordButton')}</Button>
        </form>
      }
      {user.email && user.emailVerified && !customerOnly &&
      <p className="mt-3 text-xs text-muted">{t('security.phoneOnlyNote')}</p>
      }
      {error && <p role="alert" className="mt-3 text-sm font-medium text-clay-dark">{error}</p>}
    </section>);

}
