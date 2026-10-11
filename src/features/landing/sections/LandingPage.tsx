import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { LANDING_COLORS, MAIN_ID } from '../constants';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { getLandingHighlights } from '../services/landingService';
import { FaqSection } from '../components/FaqSection';
import { FinalCtaBanner } from '../components/FinalCtaBanner';
import { HeroSection } from '../components/HeroSection';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { LandingFooter } from '../components/LandingFooter';
import { LandingHeader } from '../components/LandingHeader';
import { MarketplaceSection } from '../components/MarketplaceSection';
import { MobileActionBar } from '../components/MobileActionBar';
import { ProvidersSection } from '../components/ProvidersSection';
import { StatsRow } from '../components/StatsRow';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { TrustSection } from '../components/TrustSection';
import { CurveDivider } from '../components/ui';
import type { LoginRedirectState } from '../../auth/components/guards';
import '../landing.css';

const { cream, tealTint, orangeTint } = LANDING_COLORS;
const WHITE = '#FFFFFF';

/**
 * "/" for signed-out visitors: the public landing page, styled as a warm, busy local marketplace.
 * Section backgrounds alternate (cream, white, soft teal, soft orange) with soft curves between them.
 * Live counts, top-rated providers and review quotes come from the app's data (landingService). Never
 * shows staff features or demo accounts. Motion is limited to a gentle fade-up, off for reduced motion.
 */
export function LandingPage() {
  const { t } = useTranslation('landing');
  // Where they were going when the login requirement sent them here: kept for after they sign in.
  const from = (useLocation().state as LoginRedirectState | null)?.from;
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: highlights } = useAsyncData(getLandingHighlights);
  useDocumentMeta(t('meta.title'), t('meta.description'));

  return (
    // Room at the bottom on phones for the fixed action bar (plus the home-indicator inset).
    <div className="min-h-screen bg-[#FAF6EE] pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-base text-[#1C1B18] md:pb-0">
      <LandingHeader from={from} menuOpen={menuOpen} onMenuChange={setMenuOpen} />
      <main id={MAIN_ID} tabIndex={-1} className="focus:outline-none">
        <HeroSection from={from} highlights={highlights} />
        <StatsRow highlights={highlights} />
        <div className="h-12 lg:h-16" aria-hidden="true" />
        <CurveDivider from={cream} to={WHITE} />
        <MarketplaceSection highlights={highlights} />
        <CurveDivider from={WHITE} to={tealTint} flip />
        <HowItWorksSection />
        <CurveDivider from={tealTint} to={WHITE} />
        <TrustSection />
        <CurveDivider from={WHITE} to={orangeTint} flip />
        <ProvidersSection />
        <CurveDivider from={orangeTint} to={cream} />
        <TestimonialsSection testimonials={highlights?.testimonials ?? null} />
        <CurveDivider from={cream} to={WHITE} flip />
        <FaqSection />
        <FinalCtaBanner from={from} />
      </main>
      <LandingFooter />
      <MobileActionBar from={from} hidden={menuOpen} />
    </div>);

}
