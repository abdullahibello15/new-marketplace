import React from 'react';
import { AppShell } from './AppShell';
import { vendorNav } from '../data/navigation';
import { vendorAccount } from '../data/vendorPortal';
import { useVendors } from '../contexts/VendorsContext';
import { useRequests } from '../features/vendor-dashboard/hooks/useRequests';

export function VendorShell() {
  const { newCount } = useRequests();
  const { getVendor } = useVendors();
  const navItems = vendorNav.map((item) => item.to === '/pro' ? { ...item, badge: newCount } : item);
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
