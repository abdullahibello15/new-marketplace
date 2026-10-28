import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShoppingBasketIcon, WrenchIcon } from 'lucide-react';
import { browseCategories } from '../../../data/tradeCategories';
import { tradeBrowseLabel } from '../../../i18n/labels';
import { AUTH_ROUTES, ROLE } from '../../auth/constants';
import { LANDING_SECTION } from '../constants';
import { landingSearchUrl } from '../utils/searchLink';
import { LandingHeading, Reveal } from './ui';
import { VendorCard } from './VendorCard';
import type { CategoryKind } from '../../../types/marketplace';
import type { LoginRedirectState } from '../../auth/components/guards';
import type { LandingHighlights } from '../types';

const TABS: readonly {id: CategoryKind;icon: typeof WrenchIcon;labelKey: string;}[] = [
{ id: 'service', icon: WrenchIcon, labelKey: 'market.tabServices' },
{ id: 'retail', icon: ShoppingBasketIcon, labelKey: 'market.tabShops' }];


/**
 * "Services" | "Shops": an accessible tab switcher (arrow keys move between tabs) that swaps the category
 * cards and the top-rated row below. Counts, ratings and prices come from the app's data. On phones the
 * top-rated row scrolls sideways (by touch or keyboard; it never moves on its own).
 */
export function MarketplaceSection({ highlights }: {highlights: LandingHighlights | null;}) {
  const { t } = useTranslation('landing');
  const [kind, setKind] = useState<CategoryKind>('service');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = LANDING_SECTION.Categories;
  const categories = browseCategories.filter((c) => c.kind === kind);
  const featured = highlights?.featured[kind] ?? [];

  function onTabKey(e: KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    setKind(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <LandingHeading id={`${id}-heading`} intro={t('market.intro')}>{t('market.title')}</LandingHeading>

          <div role="tablist" aria-label={t('market.tabsLabel')} className="landing-glass mt-8 inline-flex p-1.5">
            {TABS.map((tab, i) => {
              const selected = tab.id === kind;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={`market-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="market-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setKind(tab.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-[14px] px-5 text-base font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1F4B4D]/30 motion-reduce:transition-none ${
                  selected ? 'bg-[#1F4B4D] text-white shadow-sm' : 'text-[#4F4C46] hover:text-[#16302F]'}`
                  }>

                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {t(tab.labelKey)}
                </button>);

            })}
          </div>
        </Reveal>

        <div id="market-panel" role="tabpanel" aria-labelledby={`market-tab-${kind}`} className="mt-8">
          <h3 className="sr-only">{t('market.categoriesTitle')}</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => {
              const Icon = c.icon;
              const count = highlights?.categoryCounts[c.id] ?? 0;
              return (
                <li key={c.id}>
                  <Link
                    to={AUTH_ROUTES.signupFor(ROLE.Customer)}
                    state={{ from: landingSearchUrl(c.id, '') } satisfies LoginRedirectState}
                    className="landing-glass-lite landing-glass-hover group flex h-full min-h-[132px] flex-col items-start gap-3 p-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1F4B4D]/30">

                    <span className="landing-icon-ring flex h-12 w-12 items-center justify-center rounded-full" aria-hidden="true">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </span>
                    <span className="text-base font-semibold leading-snug text-[#16302F]">{tradeBrowseLabel(c.id)}</span>
                    <span className="mt-auto text-sm text-[#55524B]">
                      {highlights ? t(kind === 'retail' ? 'market.shopsCount' : 'market.providersCount', { count }) : ' '}
                    </span>
                  </Link>
                </li>);

            })}
          </ul>

          <h3 className="landing-display mt-12 text-2xl text-[#16302F]">{t('market.featuredTitle')}</h3>
          <p className="mt-1 text-base text-[#55524B]">{t('market.featuredIntro')}</p>
          {/* Phones: a sideways row (snap). Tablets and up: a grid. Fixed card size, so loading doesn't shift things. */}
          <ul
            aria-label={t('market.featuredTitle')}
            tabIndex={0}
            className="landing-scroll-row -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1F4B4D]/20 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">

            {highlights ?
            featured.map((v, i) =>
            // Tablets (two columns) show the first four; phones scroll through all, desktops show all.
            <li key={v.id} className={`w-[78%] shrink-0 snap-start sm:w-auto ${i >= 4 ? 'sm:hidden lg:block' : ''}`}>
                  <VendorCard vendor={v} />
                </li>
            ) :
            Array.from({ length: 4 }, (_, i) =>
            <li key={i} className="h-[340px] w-[78%] shrink-0 animate-pulse rounded-[20px] bg-white/50 motion-reduce:animate-none sm:w-auto" aria-hidden="true" />
            )}
          </ul>
        </div>
      </div>
    </section>);

}
