import React from 'react';
import { AppShell } from './AppShell';
import { customerNav } from '../data/navigation';
import { messageThreads } from '../data/messages';
import { user } from '../data/user';

export function CustomerShell() {
  const unread = messageThreads.filter((t) => t.unread).length;
  const navItems = customerNav.map((item) => item.to === '/inbox' ? { ...item, badge: unread } : item);

  return (
    <AppShell
      navItems={navItems}
      homeTo="/"
      account={{ name: user.fullName, subtitle: user.location }}
      switchLink={{ to: '/pro', label: 'Vendor portal' }} />);


}