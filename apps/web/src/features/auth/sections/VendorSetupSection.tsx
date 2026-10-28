import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { lgaLabel } from '../../../i18n/labels';
import { ROLE, ROLE_META } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { completeVendorSetup } from '../services/accountService';
import { RoleSetupForm, type RoleSetupValues } from '../components/RoleSetupForm';

/**
 * /account/vendor-setup — after provider signup: the business (service or retail, business name, trade).
 * The base location and terms came with signup. Then the vendor dashboard, where the profile
 * completeness checklist takes over. One vendor profile per account.
 */
export function VendorSetupSection() {
  const { t } = useTranslation('auth');
  const { user, homeFor } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  if (!user.roles.includes(ROLE.Provider)) return <Navigate to={homeFor()} replace />;
  if (user.vendorId || !user.providerSignup) return <Navigate to={ROLE_META[ROLE.Provider].home} replace />;
  const location = user.providerSignup;

  async function submit(values: RoleSetupValues) {
    if (!values.vendor) return;
    const { kind, businessName, tradeCategory } = values.vendor;
    await completeVendorSetup({ kind, businessName, tradeCategory });
    navigate(ROLE_META[ROLE.Provider].home, { replace: true });
  }

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-sand px-3 py-2 text-xs text-muted">{t('vendorSetup.location', { lga: lgaLabel(location.lga), town: location.town })}</p>
      <RoleSetupForm role={ROLE.Provider} askName={false} businessOnly submitLabel={t('vendorSetup.submit')} onSubmit={submit} />
    </div>);

}
