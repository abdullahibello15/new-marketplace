import React from 'react';
import { AppShell } from './AppShell';
import { customerNav } from '../data/navigation';
import { messageThreads } from '../data/messages';
import { user } from '../data/user';
import { ORDER_ROUTES } from '../features/orders/constants';
import { useCart } from '../features/orders/hooks/useCart';

export function CustomerShell() {
  const unread = messageThreads.filter((t) => t.unread).length;
  const { count: cartCount } = useCart();
  const navItems = customerNav.map((item) => {
    if (item.to === '/inbox') return { ...item, badge: unread };
    if (item.to === ORDER_ROUTES.cart) return { ...item, badge: cartCount, badgeLabel: `${cartCount} ${cartCount === 1 ? 'item' : 'items'} in cart` };
    return item;
  });

  return (
    <AppShell
      navItems={navItems}
      homeTo="/"
      account={{ name: user.fullName, subtitle: user.location }}
      switchLink={{ to: '/pro', label: 'Vendor portal' }} />);


}
