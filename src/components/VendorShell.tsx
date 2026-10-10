import { useTranslation } from 'react-i18next';
import { AppShell } from './AppShell';
import { vendorNav } from '../data/navigation';
import { useRequests } from '../features/vendor-dashboard/hooks/useRequests';
import { VENDOR_ORDER_ROUTES } from '../features/orders/constants';
import { useVendorOrders } from '../features/orders/hooks/useVendorOrders';
import { VendorSubscriptionBanner } from '../features/vendor-dashboard/components/subscription/VendorSubscriptionBanner';
import { useCurrentVendor } from '../features/auth/hooks/useCurrentVendor';

/** The provider shell (the route guard makes sure the user is a provider with a vendor profile). */
export function VendorShell() {
  const { t } = useTranslation();
  const { newCount } = useRequests();
  const { newCount: newOrders } = useVendorOrders();
  const { businessName } = useCurrentVendor();
  const navItems = vendorNav.map((item) => {
    if (item.to === '/pro') return { ...item, badge: newCount };
    if (item.to === VENDOR_ORDER_ROUTES.orders) return { ...item, badge: newOrders, badgeLabel: t('shell.newOrders', { count: newOrders }) };
    return item;
  });

  return <AppShell navItems={navItems} homeTo="/pro" modeLabel={t('shell.modeVendor')} accountSubtitle={businessName} banner={<VendorSubscriptionBanner />} />;
}
