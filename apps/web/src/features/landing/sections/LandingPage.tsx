import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { LANDING_NAV, MAIN_ID, type LandingSectionId } from '../constants';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { getLandingHighlights } from '../services/landingService';
import { HeroSection } from '../components/HeroSection';
import { LandingFooter } from '../components/LandingFooter';
import { LandingHeader } from '../components/LandingHeader';
import { LandingPanelContent } from '../components/LandingPanels';
import { MobileActionBar } from '../components/MobileActionBar';
import { SectionPanel } from '../components/SectionPanel';
import type { LoginRedirectState } from '../../auth/components/guards';
import '../landing.css';

const sectionFromHash = (hash: string): LandingSectionId | null => LANDING_NAV.find((n) => `#${n.id}` === hash)?.id ?? null;

/**
 * "/" for signed-out visitors: one fixed screen. The header, the hero and a slim footer bar fill the
 * viewport and the page itself never scrolls. The header links open the other sections (how it works,
 * categories, for providers, FAQ) in a panel over the hero; each panel scrolls inside itself when its
 * content is long. Where the hero doesn't fit (phones, very short screens) only the hero area scrolls,
 * so nothing is ever cut off. Links like /#faq open that panel directly.
 */
export function LandingPage() {
  const { t } = useTranslation('landing');
  const location = useLocation();
  // Where they were going when the login requirement sent them here: kept for after they sign in.
  const from = (location.state as LoginRedirectState | null)?.from;
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<LandingSectionId | null>(() => sectionFromHash(location.hash));
  const { data: highlights } = useAsyncData(getLandingHighlights);
  useDocumentMeta(t('meta.title'), t('meta.description'));

  // Keep the URL in step (#faq while the FAQ panel is open), without adding history entries.
  useEffect(() => {
    const url = `${window.location.pathname}${window.location.search}${panel ? `#${panel}` : ''}`;
    window.history.replaceState(window.history.state, '', url);
  }, [panel]);

  const closePanel = useCallback(() => setPanel(null), []);

  return (
    <div className="landing-root flex h-[100svh] flex-col overflow-hidden bg-[#FBF7EE] text-base text-[#1C1B18]">
      <LandingHeader from={from} menuOpen={menuOpen} onMenuChange={setMenuOpen} onOpenSection={setPanel} />
      {/* Fits the screen on desktop (no scrolling); scrolls only if the hero is taller than the space. Room for the phone's bottom button. */}
      <main id={MAIN_ID} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] focus:outline-none md:pb-0">
        <HeroSection from={from} />
      </main>
      <LandingFooter />
      <MobileActionBar from={from} hidden={menuOpen || panel !== null} />
      <SectionPanel sectionId={panel} onClose={closePanel}>
        {panel && <LandingPanelContent sectionId={panel} highlights={highlights} from={from} />}
      </SectionPanel>
    </div>);

}
