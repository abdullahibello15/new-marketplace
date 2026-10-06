import {
  BanknoteIcon,
  BellIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  HomeIcon,
  InboxIcon,
  LayoutGridIcon,
  MessageSquareIcon,
  PackageIcon,
  ShoppingCartIcon,
  StarIcon,
  UserIcon,
  UserPenIcon } from
'lucide-react';
import type { NavItem } from '../types/navigation';

export const customerNav: NavItem[] = [
{ to: '/', label: 'Home', icon: HomeIcon, match: (p) => p === '/' || p.startsWith('/vendor/') || p.startsWith('/vendors/') },
{ to: '/jobs', label: 'My Jobs', icon: CalendarCheckIcon, match: (p) => p.startsWith('/jobs') || p.startsWith('/bookings') },
{ to: '/orders', label: 'My Orders', shortLabel: 'Orders', icon: PackageIcon, match: (p) => p.startsWith('/orders') },
{ to: '/cart', label: 'Cart', icon: ShoppingCartIcon, badgeStyle: 'count', match: (p) => p.startsWith('/cart') || p.startsWith('/checkout') },
{ to: '/inbox', label: 'Inbox', icon: MessageSquareIcon, match: (p) => p.startsWith('/inbox') },
{ to: '/profile', label: 'Profile', icon: UserIcon, match: (p) => p.startsWith('/profile') }];


export const vendorNav: NavItem[] = [
{ to: '/pro', label: 'Requests', icon: InboxIcon, match: (p) => p === '/pro' || p === '/pro/' || p.startsWith('/pro/requests') },
{ to: '/pro/orders', label: 'Orders', icon: PackageIcon, match: (p) => p.startsWith('/pro/orders') },
{ to: '/pro/calendar', label: 'Calendar', icon: CalendarDaysIcon, match: (p) => p.startsWith('/pro/calendar') },
{ to: '/pro/catalogue', label: 'Catalogue', shortLabel: 'Shop', icon: LayoutGridIcon, match: (p) => p.startsWith('/pro/catalogue') },
{ to: '/pro/earnings', label: 'Earnings', icon: BanknoteIcon, match: (p) => p.startsWith('/pro/earnings') },
{ to: '/pro/reviews', label: 'Reviews', icon: StarIcon, mobile: 'more', match: (p) => p.startsWith('/pro/reviews') },
{
  to: '/pro/subscription',
  label: 'Subscription',
  icon: CreditCardIcon,
  mobile: 'more',
  match: (p) => p.startsWith('/pro/subscription')
},
{
  to: '/pro/profile',
  label: 'Edit Profile',
  icon: UserPenIcon,
  group: 'account',
  mobile: 'more',
  match: (p) => p.startsWith('/pro/profile')
},
{
  to: '/pro/notifications',
  label: 'Notifications',
  icon: BellIcon,
  group: 'account',
  mobile: 'more',
  match: (p) => p.startsWith('/pro/notifications')
}];