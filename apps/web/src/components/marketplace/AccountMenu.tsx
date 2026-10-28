import { useTranslation } from 'react-i18next';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDownIcon, InfoIcon, UserIcon } from 'lucide-react';
import { customerNav } from '../../data/navigation';
import { messageThreads } from '../../data/messages';
import { AccountPanel } from '../../features/auth/components/AccountPanel';
import { AUTH_ROUTES } from '../../features/auth/constants';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { ORDER_ROUTES } from '../../features/orders/constants';
import { LanguageSelector } from '../LanguageSelector';
import { buttonClasses } from '../ui/buttonStyles';
import type { LoginRedirectState } from '../../features/auth/components/guards';

/** The buyer's account pages (the header covers home, shop and cart). */
const ACCOUNT_LINKS = customerNav.filter((i) => i.to !== '/' && i.to !== '/products' && i.to !== ORDER_ROUTES.cart);

const rowClass =
'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-sand focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40';

/**
 * What's in the account menu (desktop dropdown and the phone menu). Guests: sign in or create an
 * account (and come back to this page), the language and the page about Gwani. Signed in: their pages,
 * then the role switcher, language, devices and sign out.
 */
export function AccountMenuContent({ onNavigate }: {onNavigate?: () => void;}) {
  const { t } = useTranslation();
  const { user, status } = useAuth();
  const { pathname, search, hash } = useLocation();
  const back: LoginRedirectState = { from: `${pathname}${search}${hash}` };
  const unread = user ? messageThreads.filter((thread) => thread.unread).length : 0;

  if (status === 'loading') return null;
  if (!user) {
    return (
      <div className="space-y-3">
        <Link to={AUTH_ROUTES.login} state={back} onClick={onNavigate} className={buttonClasses({ fullWidth: true })}>{t('market.signIn')}</Link>
        <Link to={AUTH_ROUTES.signup} state={back} onClick={onNavigate} className={buttonClasses({ variant: 'secondary', fullWidth: true })}>{t('market.createAccount')}</Link>
        <LanguageSelector tone="light" className="px-1" />
        <Link to={AUTH_ROUTES.about} onClick={onNavigate} className={rowClass}>
          <InfoIcon className="h-5 w-5 text-muted" aria-hidden="true" />
          {t('action.aboutGwani')}
        </Link>
      </div>);

  }

  return (
    <div className="space-y-3">
      <nav aria-label={t('market.myAccount')}>
        <ul className="space-y-0.5">
          {ACCOUNT_LINKS.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            const badge = item.to === '/inbox' && unread > 0 ? unread : 0;
            return (
              <li key={item.to}>
                <Link to={item.to} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`${rowClass} ${active ? 'bg-sand' : ''}`}>
                  <Icon className="h-5 w-5 text-muted" aria-hidden="true" />
                  <span className="flex-1">{item.labelKey ? t(item.labelKey) : item.label}</span>
                  {badge > 0 &&
                  <span className="rounded-full bg-clay px-2 py-0.5 text-xs font-bold text-white">
                      {badge}
                      <span className="sr-only"> {t('shell.newCount', { count: badge })}</span>
                    </span>
                  }
                </Link>
              </li>);

          })}
        </ul>
      </nav>
      <div className="border-t border-line pt-3">
        <AccountPanel tone="light" onNavigate={onNavigate} />
      </div>
    </div>);

}

/** Desktop: "Account" / "Hi, Aisha" in the header, opening a dropdown. Closes on outside click, Esc or navigation. */
export function AccountMenu() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const firstName = user?.name.split(' ')[0];
  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white transition-colors duration-150 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">

        <UserIcon className="h-5 w-5" aria-hidden="true" />
        <span className="max-w-[9rem] truncate">{firstName ? t('market.hi', { name: firstName }) : t('market.account')}</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open &&
      <div id={panelId} className="absolute right-0 top-full z-40 mt-2 max-h-[80vh] w-80 overflow-y-auto rounded-2xl border border-line bg-white p-3 text-ink">
          <AccountMenuContent onNavigate={() => setOpen(false)} />
        </div>
      }
    </div>);

}
