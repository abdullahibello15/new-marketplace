import { LANDING_SECTION, type LandingSectionId } from '../constants';
import { FaqSection } from './FaqSection';
import { FinalCtaBanner } from './FinalCtaBanner';
import { HowItWorksSection } from './HowItWorksSection';
import { MarketplaceSection } from './MarketplaceSection';
import { ProvidersSection } from './ProvidersSection';
import { StatsRow } from './StatsRow';
import { TestimonialsSection } from './TestimonialsSection';
import { TrustSection } from './TrustSection';
import { CurveDivider } from './ui';
import type { LandingHighlights } from '../types';

/**
 * What each header link opens in the panel. Every section of the page lives in one of them:
 *  - Categories: the numbers, then services and shops (tabs, categories, top rated);
 *  - How it works: the steps, trust and safety, and customers' reviews;
 *  - For providers: benefits and plans, then the closing call to action;
 *  - FAQ.
 */
export function LandingPanelContent({ sectionId, highlights, from }: {sectionId: LandingSectionId;highlights: LandingHighlights | null;from?: string;}) {
  switch (sectionId) {
    case LANDING_SECTION.Categories:
      return (
        <>
          <div className="pb-6 pt-6">
            <StatsRow highlights={highlights} />
          </div>
          <CurveDivider />
          <MarketplaceSection highlights={highlights} />
        </>);

    case LANDING_SECTION.HowItWorks:
      return (
        <>
          <HowItWorksSection />
          <CurveDivider />
          <TrustSection />
          <CurveDivider />
          <TestimonialsSection testimonials={highlights?.testimonials ?? null} />
        </>);

    case LANDING_SECTION.Providers:
      return (
        <>
          <ProvidersSection />
          <CurveDivider />
          <FinalCtaBanner from={from} />
        </>);

    case LANDING_SECTION.Faq:
      return <FaqSection />;
  }
}
