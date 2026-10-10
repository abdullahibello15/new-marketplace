import {
  BanknoteIcon,
  BellIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  FileCheck2Icon,
  HomeIcon,
  InboxIcon,
  LineChartIcon,
  LayoutGridIcon,
  MessageSquareIcon,
  PackageIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
  StarIcon,
  TruckIcon,
  UserIcon,
  UserPlusIcon,
  UserPenIcon,
  UsersIcon,
  WalletIcon } from
'lucide-react';
import type { NavItem } from '../types/navigation';

export const customerNav: NavItem[] = [
{ to: '/', label: 'Home', labelKey: 'nav.home', icon: HomeIcon, match: (p) => p === '/' || p.startsWith('/vendor/') || p.startsWith('/vendors/') },
{ to: '/jobs', label: 'My Jobs', labelKey: 'nav.myJobs', icon: CalendarCheckIcon, match: (p) => p.startsWith('/jobs') || p.startsWith('/bookings') },
{ to: '/orders', label: 'My Orders', labelKey: 'nav.myOrders', shortLabel: 'Orders', shortLabelKey: 'nav.ordersShort', icon: PackageIcon, match: (p) => p.startsWith('/orders') },
{ to: '/payments', label: 'Payments', labelKey: 'nav.payments', icon: ReceiptTextIcon, mobile: 'more', match: (p) => p.startsWith('/payments') },
{ to: '/cart', label: 'Cart', labelKey: 'nav.cart', icon: ShoppingCartIcon, badgeStyle: 'count', match: (p) => p.startsWith('/cart') || p.startsWith('/checkout') },
{ to: '/inbox', label: 'Inbox', labelKey: 'nav.inbox', icon: MessageSquareIcon, match: (p) => p.startsWith('/inbox') },
{ to: '/profile', label: 'Profile', labelKey: 'nav.profile', icon: UserIcon, mobile: 'more', match: (p) => p.startsWith('/profile') }];


export const vendorNav: NavItem[] = [
{ to: '/pro', label: 'Requests', labelKey: 'nav.requests', icon: InboxIcon, match: (p) => p === '/pro' || p === '/pro/' || p.startsWith('/pro/requests') },
{ to: '/pro/orders', label: 'Orders', labelKey: 'nav.orders', icon: PackageIcon, match: (p) => p.startsWith('/pro/orders') },
{ to: '/pro/calendar', label: 'Calendar', labelKey: 'nav.calendar', icon: CalendarDaysIcon, match: (p) => p.startsWith('/pro/calendar') },
{ to: '/pro/catalogue', label: 'Catalogue', labelKey: 'nav.catalogue', shortLabel: 'Shop', shortLabelKey: 'nav.shop', icon: LayoutGridIcon, match: (p) => p.startsWith('/pro/catalogue') },
{ to: '/pro/earnings', label: 'Earnings', labelKey: 'nav.earnings', icon: BanknoteIcon, match: (p) => p.startsWith('/pro/earnings') },
{ to: '/pro/reviews', label: 'Reviews', labelKey: 'nav.reviews', icon: StarIcon, mobile: 'more', match: (p) => p.startsWith('/pro/reviews') },
{
  to: '/pro/subscription',
  label: 'Subscription', labelKey: 'nav.subscription',
  icon: CreditCardIcon,
  mobile: 'more',
  match: (p) => p.startsWith('/pro/subscription')
},
{
  to: '/pro/profile',
  label: 'Edit Profile', labelKey: 'nav.editProfile',
  icon: UserPenIcon,
  group: 'account',
  mobile: 'more',
  match: (p) => p.startsWith('/pro/profile')
},
{
  to: '/pro/association',
  label: 'Association', labelKey: 'nav.association',
  icon: UsersIcon,
  group: 'account',
  mobile: 'more',
  match: (p) => p.startsWith('/pro/association')
},
{
  to: '/pro/verification',
  label: 'Verification', labelKey: 'nav.verification',
  icon: FileCheck2Icon,
  group: 'account',
  mobile: 'more',
  match: (p) => p.startsWith('/pro/verification')
},
{
  to: '/pro/notifications',
  label: 'Notifications', labelKey: 'nav.notifications',
  icon: BellIcon,
  group: 'account',
  mobile: 'more',
  match: (p) => p.startsWith('/pro/notifications')
},
{ to: '/account/roles', label: 'Add a role', labelKey: 'nav.addRole', icon: UserPlusIcon, group: 'account', mobile: 'more', match: (p) => p.startsWith('/account/roles') }];

/** Riders: a placeholder dashboard for now; delivery jobs will be added here. */
export const riderNav: NavItem[] = [
{ to: '/rider', label: 'Dashboard', labelKey: 'nav.dashboard', icon: TruckIcon, match: (p) => p === '/rider' || p === '/rider/' },
{ to: '/account/roles', label: 'Add a role', labelKey: 'nav.addRole', icon: UserPlusIcon, group: 'account', mobile: 'more', match: (p) => p.startsWith('/account/roles') }];


export const investorNav: NavItem[] = [
{ to: '/investor', label: 'Overview', icon: LineChartIcon, match: (p) => p === '/investor' || p === '/investor/' },
{ to: '/investor/ledger', label: 'Ledger', icon: BookOpenIcon, match: (p) => p.startsWith('/investor/ledger') },
{ to: '/investor/payouts', label: 'Payouts', icon: WalletIcon, match: (p) => p.startsWith('/investor/payouts') }];
