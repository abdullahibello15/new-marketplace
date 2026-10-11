import { Trans, useTranslation } from 'react-i18next';
import { LockKeyholeIcon, MessageSquareQuoteIcon, ShieldCheckIcon } from 'lucide-react';
import { VerificationBadge } from '../../../components/VerificationBadge';
import { Highlight, IconCircle, LandingHeading, Reveal } from './ui';

/** Verification badges (the real ones customers see), escrow-protected payments and reviews. */
export function TrustSection() {
  const { t } = useTranslation('landing');
  const card = 'landing-glass landing-glass-hover h-full p-6';
  return (
    <section aria-labelledby="trust-heading" className="py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <LandingHeading id="trust-heading" intro={t('trust.intro')}>
            <Trans t={t} i18nKey="trust.title" components={{ hl: <Highlight /> }} />
          </LandingHeading>
        </Reveal>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          <li>
            <Reveal className="h-full">
              <div className={card}>
                <IconCircle icon={ShieldCheckIcon} tone="teal" size="lg" />
                <h3 className="landing-display mt-4 text-xl text-[#16302F]">{t('trust.verification.title')}</h3>
                <p className="mt-2 text-base text-[#55524B]">{t('trust.verification.text')}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <VerificationBadge verification="id" />
                  <VerificationBadge verification="trade" />
                </div>
              </div>
            </Reveal>
          </li>
          <li>
            <Reveal className="h-full">
              <div className={card}>
                <IconCircle icon={LockKeyholeIcon} tone="orange" size="lg" />
                <h3 className="landing-display mt-4 text-xl text-[#16302F]">{t('trust.escrow.title')}</h3>
                <p className="mt-2 text-base text-[#55524B]">{t('trust.escrow.text')}</p>
              </div>
            </Reveal>
          </li>
          <li>
            <Reveal className="h-full">
              <div className={card}>
                <IconCircle icon={MessageSquareQuoteIcon} tone="gold" size="lg" />
                <h3 className="landing-display mt-4 text-xl text-[#16302F]">{t('trust.reviews.title')}</h3>
                <p className="mt-2 text-base text-[#55524B]">{t('trust.reviews.text')}</p>
              </div>
            </Reveal>
          </li>
        </ul>
      </div>
    </section>);

}
