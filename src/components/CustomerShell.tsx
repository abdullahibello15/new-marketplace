import { useTranslation } from 'react-i18next';
import { AppShell } from './AppShell';
import { customerNav } from '../data/navigation';
import { messageThreads } from '../data/messages';
import { ORDER_ROUTES } from '../features/orders/constants';
import { useCart } from '../features/orders/hooks/useCart';
import { useAuth } from '../features/auth/hooks/useAuth';
import { VerifyContactBanner } from '../features/auth/components/VerifyContactBanner';

/** The customer shell. Open to everyone (browsing); pages that need an account are guarded in the routes. */
export function CustomerShell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const unread = user ? messageThreads.filter((thread) => thread.unread).length : 0;
  const { count: cartCount } = useCart();
  const navItems = customerNav.map((item) => {
    if (item.to === '/inbox') return { ...item, badge: unread };
    if (item.to === ORDER_ROUTES.cart) return { ...item, badge: cartCount, badgeLabel: t('shell.cartItems', { count: cartCount }) };
    return item;
  });

  return <AppShell navItems={navItems} homeTo="/" accountSubtitle={user?.area ?? undefined} banner={<VerifyContactBanner />} />;
}
