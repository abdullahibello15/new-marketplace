import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheckIcon, MessageCircleIcon, SearchIcon, StarIcon } from 'lucide-react';
import { nigerLgas } from '../../../data/nigerLgas';
import { browseCategories } from '../../../data/tradeCategories';
import { lgaLabel, tradeBrowseLabel } from '../../../i18n/labels';
import { AUTH_ROUTES, ROLE } from '../../auth/constants';
import { SEARCH_ROUTE } from '../../discovery/constants';
import { LANDING_PHOTOS } from '../constants';
import { landingSearchUrl } from '../utils/searchLink';
import { landingButton } from './landingStyles';
import { Highlight } from './ui';
import type { LoginRedirectState } from '../../auth/components/guards';
import type { NigerLga, TradeCategory } from '../../../types/marketplace';
import type { LandingHighlights } from '../types';

const field =
'min-h-[48px] w-full rounded-2xl border border-[#E7DECB] bg-white px-4 text-base text-[#1C1B18] focus:border-[#1F4B4D] focus:outline-none focus:ring-4 focus:ring-[#1F4B4D]/15';

/** A small white card floating over the photo collage. Static: it doesn't move. */
function FloatingCard({ className, children }: {className: string;children: ReactNode;}) {
  return (
    <div className={`absolute z-10 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-[#1C1B18] shadow-[0_10px_30px_-10px_rgba(22,58,60,0.45)] ${className}`}>
      {children}
    </div>);

}

function CollagePhoto({ src, alt, className, eager = false }: {src: {small: string;large: string;size: number;};alt: string;className: string;eager?: boolean;}) {
  return (
    <img
      src={src.small}
      srcSet={`${src.small} 480w, ${src.large} 800w`}
      sizes="(min-width: 1024px) 300px, 55vw"
      width={src.size}
      height={src.size}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`absolute aspect-square rounded-3xl object-cover shadow-[0_18px_40px_-16px_rgba(22,58,60,0.55)] ring-4 ring-white ${className}`} />);

}

/**
 * Two columns: the headline (one key word highlighted), the two main buttons and a quick search on the
 * left; on the right, three overlapping photos with floating cards. The cards' facts (verification, the
 * best rating, the fastest typical reply) come from the app's data, so they're true.
 */
export function HeroSection({ from, highlights }: {from?: string;highlights: LandingHighlights | null;}) {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const uid = useId();
  const [category, setCategory] = useState<TradeCategory | ''>('');
  const [lga, setLga] = useState<NigerLga | ''>('');

  function search(e: FormEvent) {
    e.preventDefault();
    navigate(AUTH_ROUTES.signupFor(ROLE.Customer), { state: { from: landingSearchUrl(category, lga) } satisfies LoginRedirectState });
  }

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      {/* Soft decorative blobs behind the content. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#F8EED2] opacity-70 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-[#E8F1EF] opacity-80 blur-2xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:pb-24 lg:pt-14">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#F8EED2] px-3 py-1.5 text-sm font-bold text-[#7A560C]">
            <span className="h-2 w-2 rounded-full bg-[#D9A933]" aria-hidden="true" />
            {t('hero.eyebrow')}
          </p>
          <h1 id="hero-heading" className="landing-display mt-4 text-4xl font-black leading-[1.08] text-[#1C1B18] sm:text-5xl lg:text-[3.6rem]">
            <Trans t={t} i18nKey="hero.title" components={{ hl: <Highlight /> }} />
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[#5E594F]">{t('hero.subtitle')}</p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to={AUTH_ROUTES.signupFor(ROLE.Customer)} state={{ from: from ?? SEARCH_ROUTE } satisfies LoginRedirectState} className={landingButton.primary}>
              {t('hero.findService')}
            </Link>
            <Link to={AUTH_ROUTES.signupFor(ROLE.Provider)} className={landingButton.secondary}>
              {t('hero.becomeProvider')}
            </Link>
          </div>

          <form role="search" aria-label={t('hero.searchLabel')} onSubmit={search} className="mt-8 rounded-3xl border border-[#E7DECB] bg-white p-3 shadow-[0_12px_30px_-18px_rgba(22,58,60,0.4)] sm:p-4">
            <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
              <div className="min-w-0">
                <label htmlFor={`${uid}-cat`} className="mb-1 block text-sm font-bold text-[#5E594F]">{t('hero.category')}</label>
                <select id={`${uid}-cat`} value={category} onChange={(e) => setCategory(e.target.value as TradeCategory | '')} className={field}>
                  <option value="">{t('hero.anyCategory')}</option>
                  {browseCategories.map((c) => <option key={c.id} value={c.id}>{tradeBrowseLabel(c.id)}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor={`${uid}-lga`} className="mb-1 block text-sm font-bold text-[#5E594F]">{t('hero.lga')}</label>
                <select id={`${uid}-lga`} value={lga} onChange={(e) => setLga(e.target.value as NigerLga | '')} className={field}>
                  <option value="">{t('hero.anyLga')}</option>
                  {nigerLgas.map((l) => <option key={l} value={l}>{lgaLabel(l)}</option>)}
                </select>
              </div>
              <button type="submit" className={`${landingButton.primary} w-full sm:col-span-2`}>
                <SearchIcon className="h-5 w-5" aria-hidden="true" />
                {t('hero.search')}
              </button>
            </div>
            <p className="mt-2 px-1 text-sm text-[#5E594F]">{t('hero.searchNote')}</p>
          </form>
        </div>

        {/* The collage keeps a fixed shape (aspect ratio), so nothing moves while photos load. */}
        <div className="relative mx-auto aspect-[10/9] w-full max-w-[540px]">
          <div aria-hidden="true" className="absolute inset-[8%] rounded-[3rem] bg-[#E8F1EF]" />
          <CollagePhoto src={LANDING_PHOTOS.tailor} alt={t('hero.photoTailor')} eager className="left-0 top-[4%] w-[58%]" />
          <CollagePhoto src={LANDING_PHOTOS.electrician} alt={t('hero.photoElectrician')} eager className="right-0 top-0 w-[44%]" />
          <CollagePhoto src={LANDING_PHOTOS.market} alt={t('hero.photoMarket')} eager className="bottom-0 right-[6%] w-[48%]" />

          <FloatingCard className="left-[2%] top-[56%] sm:left-[-2%]">
            <BadgeCheckIcon className="h-5 w-5 text-[#1F4B4D]" aria-hidden="true" />
            {t('hero.cardVerified')}
          </FloatingCard>
          {highlights?.topRating &&
          <FloatingCard className="bottom-[4%] left-[8%]">
              <StarIcon className="h-5 w-5 fill-[#D9A933] text-[#D9A933]" aria-hidden="true" />
              {t('hero.cardRating', { rating: highlights.topRating.toFixed(1) })}
            </FloatingCard>
          }
          {highlights?.fastestReplyMinutes &&
          <FloatingCard className="right-[-1%] top-[44%]">
              <MessageCircleIcon className="h-5 w-5 text-[#C0501F]" aria-hidden="true" />
              {t('hero.cardReply', { minutes: highlights.fastestReplyMinutes })}
            </FloatingCard>
          }
        </div>
      </div>
    </section>);

}
