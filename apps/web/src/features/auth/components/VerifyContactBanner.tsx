import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MailWarningIcon, PhoneOffIcon } from 'lucide-react';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { AUTH_ROUTES, ROLE } from '../constants';
import { useAuth } from '../hooks/useAuth';

/**
 * The reminder at the top of the customer and vendor shells while something isn't verified yet:
 *  - providers without a verified phone: their business is hidden from customers (most urgent);
 *  - customers without a verified email: they can browse, but booking and paying need it;
 *  - providers with an unverified email: verify it when convenient.
 */
export function VerifyContactBanner() {
  const { t } = useTranslation('auth');
  const { user } = useAuth();
  if (!user) return null;
  const provider = user.activeRole === ROLE.Provider;
  const customer = user.activeRole === ROLE.Customer;

  let notice: {key: string;to: string;urgent: boolean;} | null = null;
  if (provider && !user.phoneVerified) notice = { key: 'phoneProvider', to: AUTH_ROUTES.verifyPhone, urgent: true };else
  if (customer && user.email && !user.emailVerified && !user.phoneVerified) notice = { key: 'emailCustomer', to: AUTH_ROUTES.verifyEmail, urgent: true };else
  if ((provider || customer) && user.email && !user.emailVerified) notice = { key: 'emailLater', to: AUTH_ROUTES.verifyEmail, urgent: false };
  if (!notice) return null;
  const Icon = notice.key === 'phoneProvider' ? PhoneOffIcon : MailWarningIcon;

  return (
    <div className="mx-auto max-w-6xl px-5 pt-4 lg:px-10 print:hidden">
      <section
        aria-labelledby="verify-banner-heading"
        className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 text-ink sm:flex-row sm:items-center lg:px-5 ${notice.urgent ? 'border-mustard/60 bg-[#F7EBCB]' : 'border-line bg-sand'}`}>

        <Icon className={`h-5 w-5 shrink-0 ${notice.urgent ? 'text-mustard-dark' : 'text-muted'}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="verify-banner-heading" className="font-bold">{t(`verify.banner.${notice.key}.title`)}</h2>
          <p className="text-sm">{t(`verify.banner.${notice.key}.text`)}</p>
        </div>
        <Link to={notice.to} className={buttonClasses({ variant: notice.urgent ? 'accent' : 'secondary', size: 'sm' })}>{t('verify.banner.action')}</Link>
      </section>
    </div>);

}
