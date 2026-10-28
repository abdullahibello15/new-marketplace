import { useTranslation } from 'react-i18next';
import { roleLabel } from '../../../i18n/labels';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROLE, ROLE_META, type SignupRole } from '../constants';
import { isAuthError } from '../errors';
import { useAuth } from '../hooks/useAuth';
import { addRole } from '../services/accountService';
import { RoleCards } from '../components/RoleCards';
import { RoleSetupForm, type RoleSetupValues } from '../components/RoleSetupForm';

/** /account/roles — add another role (e.g. a customer who becomes a provider), then switch to it. */
export function AddRoleSection() {
  const { t } = useTranslation('auth');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<SignupRole | null>(null);
  const [claimPath, setClaimPath] = useState<string | null>(null);
  if (!user) return null;
  const owned = user.roles;
  const all = [ROLE.Customer, ROLE.Provider, ROLE.Rider].every((r) => owned.includes(r));

  async function submit(r: SignupRole, values: RoleSetupValues) {
    try {
      if (r === ROLE.Provider && values.vendor) await addRole({ role: r, vendor: values.vendor });else
      if (r === ROLE.Rider && values.rider) await addRole({ role: r, rider: values.rider });else
      await addRole({ role: ROLE.Customer });
      navigate(ROLE_META[r].home, { replace: true });
    } catch (e) {
      if (isAuthError(e) && e.code === 'invite_exists') setClaimPath(e.claimPath);
      throw e;
    }
  }

  if (all) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-extrabold">{t('addRole.allTitle')}</h1>
        <p className="text-sm text-muted">{t('addRole.allBody')}</p>
        <Link to={ROLE_META[user.activeRole].home} className="font-bold text-pine underline">{t('common:action.back')}</Link>
      </div>);

  }

  return (
    <div className="space-y-4">
      {role ?
      <RoleSetupForm role={role} askName={false} submitLabel={t('addRole.addButton', { role: roleLabel(role, ROLE_META[role].label) })} onSubmit={(v) => submit(role, v)} onBack={() => setRole(null)} /> :

      <>
          <RoleCards onSelect={(r) => r === ROLE.Customer ? void submit(ROLE.Customer, { name: user.name, email: '' }).catch(() => undefined) : setRole(r)} exclude={owned} heading={t('addRole.heading')} />
          <p className="text-sm text-muted">{t('addRole.keepNote')}</p>
          <Link to={ROLE_META[user.activeRole].home} className="text-sm font-semibold text-pine underline">{t('common:action.cancel')}</Link>
        </>
      }
      {claimPath &&
      <p className="rounded-xl bg-[#E3EEEC] px-4 py-3 text-sm">
          {t('signup.inviteExists')} <Link to={claimPath} className="font-bold text-pine underline">{t('signup.claimNow')}</Link>
        </p>
      }
    </div>);

}
