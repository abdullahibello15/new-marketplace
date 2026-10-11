import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckIcon } from 'lucide-react';
import { planName, planTagline } from '../../../i18n/labels';
import { formatNaira } from '../../../utils/format';
import { AUTH_ROUTES, PROVIDER_SIGNUP, ROLE } from '../../auth/constants';
import { PLANS } from '../../vendor-dashboard/plans';
import { LANDING_PHOTOS, LANDING_SECTION } from '../constants';
import { landingButton } from './landingStyles';
import { Highlight, LandingHeading, Reveal } from './ui';

const BENEFITS = ['benefit1', 'benefit2', 'benefit3', 'benefit4'] as const;

/** Why join, the subscription plans from the plan config (one source of prices), and "Join as a provider". */
export function ProvidersSection() {
  const { t } = useTranslation('landing');
  const id = LANDING_SECTION.Providers;
  const plans = [...PLANS].sort((a, b) => a.price - b.price);
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal className="min-w-0">
            <LandingHeading id={`${id}-heading`} intro={t('providers.intro')}>
              <Trans t={t} i18nKey="providers.title" components={{ hl: <Highlight /> }} />
            </LandingHeading>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((b) =>
              <li key={b} className="flex gap-3">
                  <span className="landing-icon-ring mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" aria-hidden="true">
                    <CheckIcon className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span className="text-base text-[#2E2C28]">{t(`providers.${b}`)}</span>
                </li>
              )}
            </ul>
            <Link to={AUTH_ROUTES.signupFor(ROLE.Provider)} className={`${landingButton.primary} mt-8`}>
              {t('providers.join')}
            </Link>
          </Reveal>
          <Reveal>
            <div className="relative mx-auto aspect-square w-full max-w-md">
              <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rounded-[2.5rem] border border-[#B98C34]/50" />
              <img
                src={LANDING_PHOTOS.plumber.small}
                srcSet={`${LANDING_PHOTOS.plumber.small} 480w, ${LANDING_PHOTOS.plumber.large} 800w`}
                sizes="(min-width: 1024px) 440px, 90vw"
                width={LANDING_PHOTOS.plumber.size}
                height={LANDING_PHOTOS.plumber.size}
                alt={t('providers.imageAlt')}
                loading="lazy"
                decoding="async"
                className="relative h-full w-full rounded-[2.5rem] object-cover" />

            </div>
          </Reveal>
        </div>

        <Reveal className="mt-14">
          <h3 className="landing-display text-2xl text-[#16302F]">{t('providers.plansTitle')}</h3>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {plans.map((plan) =>
            <li key={plan.id} className="landing-glass landing-glass-hover flex flex-col p-6">
                <p className="landing-label text-[#7A5E1F]">{planName(plan.id, plan.name)}</p>
                <p className="mt-2">
                  <span className="landing-display text-4xl tabular-nums text-[#16302F]">{formatNaira(plan.price)}</span>{' '}
                  <span className="text-base text-[#55524B]">{t('providers.perMonth')}</span>
                </p>
                <p className="mt-3 text-base text-[#55524B]">{planTagline(plan.id, plan.tagline)}</p>
              </li>
            )}
          </ul>
          <p className="mt-4 text-base text-[#55524B]">{t('providers.trial', { days: PROVIDER_SIGNUP.trialDays })}</p>
        </Reveal>
      </div>
    </section>);

}
