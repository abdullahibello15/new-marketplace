import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MenuIcon, XIcon } from 'lucide-react';
import { LanguageSelector } from '../../../components/LanguageSelector';
import { LANDING_NAV, MAIN_ID } from '../constants';
import { useScrolledPast, useScrollToSection } from '../hooks/useLandingScroll';
import { LandingCtas } from './LandingCtas';

interface LandingHeaderProps {
  from?: string;
  menuOpen: boolean;
  onMenuChange: (open: boolean) => void;
}

const MENU_ID = 'landing-menu';

/**
 * The sticky header. It's `position: sticky` in the normal flow with a fixed height, so it reserves its
 * own space and never shifts the page; scrolling only adds a shadow and border (no size change). Below
 * xl the section links move into a full-width menu panel (hamburger), which closes on Escape, on a link
 * tap, and returns focus to the button.
 */
export function LandingHeader({ from, menuOpen, onMenuChange }: LandingHeaderProps) {
  const { t } = useTranslation('landing');
  const scrolled = useScrolledPast();
  const scrollTo = useScrollToSection();
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

  function go(id: string) {
    onMenuChange(false);
    scrollTo(id);
  }

  const links = (vertical: boolean) =>
  LANDING_NAV.map((item) =>
  <li key={item.id}>
        <a
      href={`#${item.id}`}
      onClick={(e) => {
        e.preventDefault();
        go(item.id);
      }}
      className={`flex min-h-[44px] items-center rounded-xl font-bold text-[#1C1B18] hover:bg-[#E8F1EF] hover:text-[#1F4B4D] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1F4B4D]/25 ${vertical ? 'px-3 text-lg' : 'whitespace-nowrap px-3 text-base'}`}>

          {t(item.labelKey)}
        </a>
      </li>
  );

  return (
    <header
      className={`sticky top-0 z-40 h-16 border-b bg-[#FAF6EE]/95 backdrop-blur transition-shadow duration-200 motion-reduce:transition-none ${scrolled || menuOpen ? 'border-[#EFE7D6] shadow-[0_8px_24px_-16px_rgba(22,58,60,0.45)]' : 'border-transparent shadow-none'}`}>

      <a href={`#${MAIN_ID}`} className="sr-only rounded-lg bg-pine-deep px-4 py-2 font-bold text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50">
        {t('skip')}
      </a>
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" onClick={() => window.scrollTo({ top: 0 })} aria-label={t('nav.home')} className="flex shrink-0 items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D9A933] text-lg font-black text-[#1C1B18] shadow-[0_6px_14px_-6px_rgba(217,169,51,0.9)]" aria-hidden="true">G</span>
          <span className="landing-display text-2xl font-black text-[#1C1B18]">Gwani</span>
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
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-[#1C1B18] hover:bg-[#E8F1EF] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1F4B4D]/25 xl:hidden">

            {menuOpen ? <XIcon className="h-6 w-6" aria-hidden="true" /> : <MenuIcon className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen &&
      <div ref={menuRef} id={MENU_ID} className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-b-3xl border-b border-[#EFE7D6] bg-white px-4 pb-6 pt-2 shadow-[0_20px_40px_-20px_rgba(22,58,60,0.45)] sm:px-6 xl:hidden">
          <nav aria-label={t('nav.label')}>
            <ul className="space-y-1">{links(true)}</ul>
          </nav>
          <div className="mt-4 space-y-4 border-t border-[#EFE7D6] pt-4">
            <LanguageSelector variant="buttons" />
            <LandingCtas from={from} fullWidth onNavigate={() => onMenuChange(false)} />
          </div>
        </div>
      }
    </header>);

}
