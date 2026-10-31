import { useTranslation } from 'react-i18next';
import { AppShell } from './AppShell';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { useAuth } from '../features/auth/hooks/useAuth';
import { AUTH_ROUTES, ROLE } from '../features/auth/constants';

/** Providers without a profile get the vendor portal shell without loading vendor-profile services. */
export function VendorSetupShell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return null;

  // Keep the existing account-layout redirect behavior for signed-in customers and admins.
  if (!user.roles.includes(ROLE.Provider)) return <AuthLayout />;

  return <AppShell navItems={[]} homeTo={AUTH_ROUTES.vendorSetup} modeLabel={t('shell.modeVendor')} />;
}
