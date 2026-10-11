import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AUTH_ROUTES, ROLE } from '../../auth/constants';
import { landingButton } from './landingStyles';
import { Reveal } from './ui';
import type { LoginRedirectState } from '../../auth/components/guards';

/** The closing banner: deep teal with a soft gold glow, a dark glass card, "Create account" and "Join as a provider". */
export function FinalCtaBanner({ from }: {from?: string;}) {
  const { t } = useTranslation('landing');
  return (
    <section aria-labelledby="final-cta-heading" className="px-4 pb-14 sm:px-6 lg:pb-20">
      <Reveal>
        <div className="landing-teal-bg relative mx-auto max-w-6xl overflow-hidden rounded-[28px] px-4 py-10 text-center sm:px-10 lg:py-14">
          <div className="landing-glass-dark mx-auto max-w-2xl px-6 py-10 sm:px-10">
            <h2 id="final-cta-heading" className="landing-display text-3xl text-white sm:text-4xl">{t('finalCta.title')}</h2>
            <div aria-hidden="true" className="mx-auto mt-4 h-px w-16 bg-[#E6CF95]/70" />
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">{t('finalCta.text')}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={AUTH_ROUTES.signup} state={{ from } satisfies LoginRedirectState} className={landingButton.onDark}>{t('finalCta.button')}</Link>
              <Link to={AUTH_ROUTES.signupFor(ROLE.Provider)} className={landingButton.light}>{t('providers.join')}</Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>);

}
