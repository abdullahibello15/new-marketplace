import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { APP_INITIAL, APP_NAME } from '../../../config/brand';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { EnglishOnly } from '../../../i18n/EnglishOnly';
import { useAuth } from '../../auth/hooks/useAuth';
import { ADMIN_ROUTES } from '../constants';
import type { LoginRedirectState } from '../../auth/components/guards';
import { signInAdmin } from '../services/adminLoginService';

export function AdminLoginSection() {
  return (
    <EnglishOnly>
      <AdminLogin />
    </EnglishOnly>
  );
}

function AdminLogin() {
  const { t } = useTranslation('admin');
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const redirect = useLocation().state as LoginRedirectState | null;
  const target = redirect?.from?.startsWith(ADMIN_ROUTES.home) ? redirect.from : ADMIN_ROUTES.home;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user && hasRole('admin')) return <Navigate to={target} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await signInAdmin(email.trim(), password);
      if (result.status === 'signed_in') {
        navigate(target, { replace: true });
      } else if (result.status === 'not_admin') {
        setError('This account is not an admin');
      } else if (result.status === 'rate_limited') {
        setError('Too many attempts, try again later');
      } else {
        setError('Invalid email or password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-4 py-10">
      <section aria-labelledby="admin-login-heading" className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3" aria-label={APP_NAME}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-lg font-extrabold text-white" aria-hidden="true">{APP_INITIAL}</span>
          <span className="font-extrabold text-ink">{APP_NAME}</span>
        </div>
        <h1 id="admin-login-heading" className="mt-5 text-xl font-extrabold text-ink">{t('login.title')}</h1>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <FormField id="admin-email" label="Email">
            {(describedBy) => <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby={describedBy} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-ink" />}
          </FormField>
          <FormField id="admin-password" label="Password">
            {(describedBy) => <PasswordControl value={password} onChange={setPassword} describedBy={describedBy} />}
          </FormField>
          {error && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{error}</p>}
          <Button type="submit" fullWidth loading={isSubmitting}>Sign in</Button>
        </form>
      </section>
    </main>
  );
}

function PasswordControl({ value, onChange, describedBy }: { value: string; onChange: (value: string) => void; describedBy?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative mt-1.5">
      <input id="admin-password" type={visible ? 'text' : 'password'} autoComplete="current-password" required value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={describedBy} className="w-full rounded-xl border border-line bg-white px-3 py-2.5 pr-16 text-ink outline-none focus:border-ink" />
      <button type="button" onClick={() => setVisible((shown) => !shown)} aria-label={visible ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-3 text-sm font-semibold text-muted">{visible ? 'Hide' : 'Show'}</button>
    </div>
  );
}
