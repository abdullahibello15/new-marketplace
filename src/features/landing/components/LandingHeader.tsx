import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MenuIcon, XIcon } from 'lucide-react';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { AUTH_ROUTES } from '../../auth/constants';
import { LANDING_NAV, MAIN_ID, type LandingSectionId } from '../constants';
import { LandingCtas } from './LandingCtas';
import { APP_INITIAL, APP_NAME } from '../../../config/brand';

interface LandingHeaderProps {
  from?: string;
  menuOpen: boolean;
  onMenuChange: (open: boolean) => void;
  /** Opens a section in the panel over the hero. */
  onOpenSection: (id: LandingSectionId) => void;
}

const MENU_ID = 'landing-menu';

/**
 * The header bar at the top of the fixed landing screen (cream glass, fine gold line underneath). Its
 * section links open each section in a panel over the hero (the page itself doesn't scroll). Below xl
 * the links move into a full-width menu (hamburger), which closes on Escape or a tap and returns focus
 * to the button. On phones the menu also holds the footer links (terms, staff login).
 */
export function LandingHeader({ from, menuOpen, onMenuChange, onOpenSection }: LandingHeaderProps) {
  const { t } = useTranslation('landing');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onMenuChange(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, onMenuChange]);

  function open(id: LandingSectionId) {
    onMenuChange(false);
    onOpenSection(id);
  }

  const links = (vertical: boolean) =>
  LANDING_NAV.map((item) =>
  <li key={item.id}>
        <a
      href={`#${item.id}`}
      aria-haspopup="dialog"
      onClick={(e) => {
        e.preventDefault();
        open(item.id);
      }}
      className={`flex min-h-[44px] items-center rounded-full font-medium text-[#2E2C28] hover:bg-white/60 hover:text-[#1F4B4D] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1F4B4D]/25 ${vertical ? 'px-3 text-lg' : 'whitespace-nowrap px-4 text-[15px]'}`}>

          {t(item.labelKey)}
        </a>
      </li>
  );

  const footerLink = 'rounded underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4B4D]/30';

  return (
    <header className="landing-nav-glass relative z-40 h-16 shrink-0">
      <a href={`#${MAIN_ID}`} className="sr-only rounded-lg bg-pine-deep px-4 py-2 font-bold text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50">
        {t('skip')}
      </a>
      <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" aria-label={t('nav.home')} className="flex shrink-0 items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
          <span className="landing-display flex h-10 w-10 items-center justify-center rounded-full border border-[#B98C34]/70 bg-white/60 text-xl text-[#1F4B4D]" aria-hidden="true">{APP_INITIAL}</span>
          <span className="landing-display max-w-[8rem] text-base leading-tight text-[#16302F] sm:max-w-none sm:text-2xl">{APP_NAME}</span>
        </Link>

        <nav aria-label={t('nav.label')} className="ml-4 hidden xl:block">
          <ul className="flex items-center gap-1">{links(false)}</ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector className="landing-lang-compact hidden sm:block" />
          <div className="hidden md:block">
            <LandingCtas from={from} compact />
          </div>
          <button
            ref={buttonRef}
            type="button"
            onClick={() => onMenuChange(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls={MENU_ID}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#16302F] hover:bg-white/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1F4B4D]/25 xl:hidden">

            {menuOpen ? <XIcon className="h-6 w-6" aria-hidden="true" /> : <MenuIcon className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen &&
      <div ref={menuRef} id={MENU_ID} className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-b-[20px] border-b border-[#B98C34]/30 bg-[#FBF7EE] px-4 pb-6 pt-2 shadow-[0_8px_32px_rgba(15,60,60,0.12)] sm:px-6 xl:hidden">
          <nav aria-label={t('nav.label')}>
            <ul className="space-y-1">{links(true)}</ul>
          </nav>
          <div className="mt-4 space-y-4 border-t border-[#B98C34]/30 pt-4">
            <LanguageSelector variant="buttons" />
            <LandingCtas from={from} fullWidth onNavigate={() => onMenuChange(false)} />
          </div>
          {/* Phones: the footer bar is hidden, so its links live here. */}
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#B98C34]/30 pt-4 text-sm text-[#5A5650] md:hidden">
            <li><Link to={AUTH_ROUTES.providerTerms} className={footerLink}>{t('footer.providerTerms')}</Link></li>
            <li>{t('footer.termsShort')}</li>
            <li>{t('footer.privacyShort')}</li>
            <li><Link to={AUTH_ROUTES.staffLogin} className={`${footerLink} text-[#7A756C]`}>{t('footer.staffLogin')}</Link></li>
            <li className="w-full">{t('footer.rights', { year: new Date().getFullYear() })}</li>
          </ul>
        </div>
      }
    </header>);

}
