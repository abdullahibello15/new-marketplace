import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheckIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { EnglishOnly } from '../../../i18n/EnglishOnly';
import { ROLE } from '../../auth/constants';
import { useAuth } from '../../auth/hooks/useAuth';
import { PhoneOtpForm } from '../../auth/components/PhoneOtpForm';
import { ADMIN_ROUTES } from '../constants';
import type { LoginRedirectState } from '../../auth/components/guards';
import type { VerifyOtpResult } from '../../auth/types';

/**
 * /admin/login — Gwani staff sign in with their phone number and a one-time code, like every staff
 * account. A plain page: no customer branding, no signup, no demo accounts. Staff session rules (short
 * sessions, audit log entries) apply as usual. Linked only from the landing page footer.
 */
export function AdminLoginSection() {
  return (
    <EnglishOnly>
      <StaffLogin />
    </EnglishOnly>);

}

function StaffLogin() {
  const { t } = useTranslation('admin');
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const redirect = useLocation().state as LoginRedirectState | null;
  const from = redirect?.from;
  const [noAccount, setNoAccount] = useState(false);
  const target = from?.startsWith(ADMIN_ROUTES.home) ? from : ADMIN_ROUTES.home;

  if (user && hasRole(ROLE.Admin)) return <Navigate to={target} replace />;

  function onVerified(result: VerifyOtpResult) {
    // A number without an account doesn't go on to signup here: staff accounts are created by a Super admin.
    if (result.status === 'new_user') setNoAccount(true);else
    if (result.user.roles.includes(ROLE.Admin)) navigate(target, { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-4 py-10">
      <section aria-labelledby="staff-login-heading" className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm">
        <ShieldCheckIcon className="h-8 w-8 text-ink" aria-hidden="true" />
        <h1 id="staff-login-heading" className="mt-3 text-xl font-extrabold text-ink">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('login.intro')}</p>
        {redirect?.reason && <p role="status" className="mt-3 rounded-xl bg-[#FBEFD2] px-4 py-3 text-sm font-medium text-mustard-dark">{t(`auth:session.ended.${redirect.reason}`)}</p>}
        <div className="mt-5">
          {user ?
          <div className="space-y-3">
              <p role="alert" className="rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{t('login.notStaff')}</p>
              <Button variant="secondary" fullWidth onClick={() => void signOut()}>{t('login.signOut')}</Button>
            </div> :

          <PhoneOtpForm onVerified={onVerified} remember={false} />
          }
          {noAccount && <p role="alert" className="mt-3 rounded-xl bg-clay-soft px-4 py-3 text-sm font-medium text-clay-dark">{t('login.noAccount')}</p>}
        </div>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-muted underline underline-offset-2">{t('login.back')}</Link>
      </section>
    </main>);

}
