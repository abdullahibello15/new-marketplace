import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { APP_INITIAL, APP_NAME } from '../../../config/brand';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { useAuth } from '../../auth/hooks/useAuth';
import { isVendorPortalPath, type LoginRedirectState } from '../../auth/components/guards';
import { signInVendor, vendorLoginErrorMessage } from '../services/vendorLoginService';

export function VendorLoginSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = location.state as LoginRedirectState | null;
  const target = redirect?.from && isVendorPortalPath(redirect.from) ? redirect.from : '/pro';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => (location.state as {error?: string} | null)?.error ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user?.roles.includes('provider')) return <Navigate to={target} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await signInVendor(identifier.trim(), password);
      if (result.status === 'signed_in') navigate(target, { replace: true });
      else if (result.status === 'not_vendor') navigate('/vendor/login', { replace: true, state: { error: vendorLoginErrorMessage(result.status) } });
      else setError(vendorLoginErrorMessage(result.status));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-4 py-10">
      <section aria-labelledby="vendor-login-heading" className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3" aria-label={APP_NAME}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-lg font-extrabold text-white" aria-hidden="true">{APP_INITIAL}</span>
          <span className="font-extrabold text-ink">{APP_NAME}</span>
        </div>
        <h1 id="vendor-login-heading" className="mt-5 text-xl font-extrabold text-ink">Vendor sign in</h1>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <FormField id="vendor-identifier" label="Email or phone">
            {(describedBy) => <input id="vendor-identifier" type="text" autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} aria-describedby={describedBy} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-ink" />}
          </FormField>
          <FormField id="vendor-password" label="Password">
            {(describedBy) => <input id="vendor-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby={describedBy} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink outline-none focus:border-ink" />}
          </FormField>
          {error && <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{error}</p>}
          <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>Sign in</Button>
        </form>
      </section>
    </main>
  );
}
