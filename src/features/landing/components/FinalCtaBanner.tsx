import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AUTH_ROUTES, ROLE } from '../../auth/constants';
import { landingButton } from './landingStyles';
import { Reveal } from './ui';
import type { LoginRedirectState } from '../../auth/components/guards';

/** The bold closing banner: deep teal with a subtle dot pattern, an orange "Create account" and "Join as a provider". */
export function FinalCtaBanner({ from }: {from?: string;}) {
  const { t } = useTranslation('landing');
  return (
    <section aria-labelledby="final-cta-heading" className="bg-white px-4 pb-14 sm:px-6 lg:pb-20">
      <Reveal>
        <div className="landing-pattern relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#163A3C] px-6 py-12 text-center sm:px-12 lg:py-16">
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#D9A933]/20 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-[#CF5A2E]/25 blur-2xl" />
          <h2 id="final-cta-heading" className="landing-display relative text-3xl font-black text-white sm:text-4xl">{t('finalCta.title')}</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-lg text-white/85">{t('finalCta.text')}</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={AUTH_ROUTES.signup} state={{ from } satisfies LoginRedirectState} className={landingButton.primary}>{t('finalCta.button')}</Link>
            <Link to={AUTH_ROUTES.signupFor(ROLE.Provider)} className={landingButton.light}>{t('providers.join')}</Link>
          </div>
        </div>
      </Reveal>
    </section>);

}
