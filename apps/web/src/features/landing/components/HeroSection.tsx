import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, BadgeCheckIcon, HeadsetIcon, ShieldCheckIcon, TruckIcon, type LucideIcon } from 'lucide-react';
import { AUTH_ROUTES, ROLE } from '../../auth/constants';
import { SEARCH_ROUTE } from '../../discovery/constants';
import { HERO_IMAGE } from '../constants';
import { landingButton } from './landingStyles';
import type { LoginRedirectState } from '../../auth/components/guards';

/**
 * ⚠️ CONFIRM before launch: "Fast & Reliable Delivery" (delivery is offered by each shop, where it
 * offers it) and "24/7 Support" (no support line exists yet) are promises the business has to keep.
 */
const FEATURES: readonly {key: string;icon: LucideIcon;}[] = [
{ key: 'delivery', icon: TruckIcon },
{ key: 'payments', icon: ShieldCheckIcon },
{ key: 'verified', icon: BadgeCheckIcon },
{ key: 'support', icon: HeadsetIcon }];


/** The key phrase in the headline: deep-teal italic on a fine gold underline. */
function MarkerHighlight({ children }: {children?: ReactNode;}) {
  return <span className="landing-marker text-[#1F4B4D]">{children}</span>;
}

/**
 * The hero: on desktop the headline (one phrase highlighted), subtext, the "Start Shopping" call to action
 * (the only orange button on the page), "Become a provider" and the feature strip on a glass card on the
 * left; the image on the right, over soft light glows, bleeding to the screen edge. On phones and tablets
 * it stacks: text, full-width button, a 2x2 feature card, then the image. All text is real text.
 */
export function HeroSection({ from }: {from?: string;}) {
  const { t } = useTranslation('landing');

  return (
    <section aria-labelledby="hero-heading" className="landing-glass-bg relative flex min-h-full flex-col justify-center overflow-hidden">
      <div className="grid w-full items-center gap-10 pb-10 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-6 lg:py-4">
        {/* Left column: its text lines up with the header logo (7xl container); the image column runs to the screen edge. */}
        <div className="relative min-w-0 px-4 sm:px-6 lg:py-10 lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:pr-0">
          <h1 id="hero-heading" className="landing-display landing-hero-title max-w-[16ch] text-[2.3rem] leading-[1.1] text-[#16302F] sm:text-5xl md:text-[3.4rem] xl:text-[4rem]">
            <Trans t={t} i18nKey="hero.title" components={{ hl: <MarkerHighlight /> }} />
          </h1>
          <div aria-hidden="true" className="mt-6 h-px w-20 bg-[#B98C34]/70" />
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-[#4F4C46] sm:text-xl">{t('hero.subtitle')}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to={AUTH_ROUTES.signupFor(ROLE.Customer)}
              state={{ from: from ?? SEARCH_ROUTE } satisfies LoginRedirectState}
              className={`${landingButton.cta} min-h-[56px] gap-3 px-8 text-lg motion-safe:hover:-translate-y-0.5`}>

              {t('hero.startShopping')}
              <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link to={AUTH_ROUTES.signupFor(ROLE.Provider)} className={landingButton.secondary}>
              {t('hero.becomeProvider')}
            </Link>
          </div>

          {/*
            A glass card. Phones and tablets: a 2x2 grid, icon beside label. Desktop: one row with thin gold
            dividers, each icon above its two-line label.
           */}
          <ul className="landing-glass mt-10 grid grid-cols-2 gap-x-6 gap-y-5 p-5 lg:flex lg:items-start lg:gap-0 lg:divide-x lg:divide-[#B98C34]/30 lg:px-4 lg:py-5">
            {FEATURES.map(({ key, icon: Icon }) =>
            <li key={key} className="flex items-center gap-3 lg:flex-1 lg:flex-col lg:gap-2 lg:px-3 lg:text-center">
                <span className="landing-icon-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full" aria-hidden="true">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span className="max-w-[8.5rem] text-[15px] font-medium leading-snug text-[#2E2C28] sm:text-base lg:max-w-none lg:text-[15px]">{t(`hero.features.${key}`)}</span>
              </li>
            )}
          </ul>
        </div>

        {/* Right column: the image over two soft light glows (gradients, not blur filters), bleeding to the right edge. */}
        <div className="relative min-w-0 px-4 sm:px-6 lg:pl-0 lg:pr-0">
          <div aria-hidden="true" className="pointer-events-none absolute right-[4%] top-0 h-[70%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(217,169,51,0.22),transparent)]" />
          <div aria-hidden="true" className="pointer-events-none absolute left-[10%] top-[18%] h-[60%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgba(31,75,77,0.14),transparent)]" />
          {/* Fixed width and height (and aspect ratio), so nothing jumps while it loads. Never cropped: the whole picture shows. */}
          <img
            src={HERO_IMAGE.small}
            srcSet={`${HERO_IMAGE.small} ${HERO_IMAGE.smallWidth}w, ${HERO_IMAGE.large} ${HERO_IMAGE.largeWidth}w`}
            sizes="(min-width: 1024px) 52vw, 100vw"
            width={HERO_IMAGE.largeWidth}
            height={HERO_IMAGE.largeHeight}
            alt={t('hero.imageAlt')}
            loading="lazy"
            decoding="async"
            className="landing-feather relative mx-auto h-auto w-full max-w-[620px] object-contain lg:ml-auto lg:mr-0 lg:h-[min(820px,calc(100svh-9rem))] lg:w-auto lg:max-w-full" />

        </div>
      </div>
    </section>);

}
