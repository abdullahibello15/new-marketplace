import React from 'react';
import { AppShell } from './AppShell';
import { vendorNav } from '../data/navigation';
import { vendorAccount } from '../data/vendorPortal';
import { useVendors } from '../contexts/VendorsContext';
import { useRequests } from '../features/vendor-dashboard/hooks/useRequests';
import { VENDOR_ORDER_ROUTES } from '../features/orders/constants';
import { useVendorOrders } from '../features/orders/hooks/useVendorOrders';

export function VendorShell() {
  const { newCount } = useRequests();
  const { newCount: newOrders } = useVendorOrders();
  const { getVendor } = useVendors();
  const navItems = vendorNav.map((item) => {
    if (item.to === '/pro') return { ...item, badge: newCount };
    if (item.to === VENDOR_ORDER_ROUTES.orders) return { ...item, badge: newOrders, badgeLabel: `${newOrders} new ${newOrders === 1 ? 'order' : 'orders'}` };
    return item;
  });
  // The public name is editable on Edit Profile, so read it from the live profile.
  const name = getVendor(vendorAccount.vendorId)?.name ?? vendorAccount.businessName;

  return (
    <AppShell
      navItems={navItems}
      homeTo="/pro"
      modeLabel="Vendor"
      account={{ name, subtitle: `Subscription · ${vendorAccount.tier}` }}
      switchLink={{ to: '/', label: 'Customer mode' }} />);


}
