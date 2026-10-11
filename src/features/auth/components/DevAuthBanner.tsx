import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { AUTH_ROUTES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { MOCK_AUTH, MOCK_OTP_CODE } from '../config';
import { devOutbox, subscribeDevOutbox } from '../services/authBackend';
import { DevSessionPanel } from './DevSessionPanel';
import { resetDemoData } from '../services/demoReset';

function Banner() {
  const { t } = useTranslation('auth');
  const messages = useSyncExternalStore(subscribeDevOutbox, devOutbox, devOutbox);
  const [open, setOpen] = useState(false);
  const latest = messages[0];
  return (
    <aside data-dev-only="auth-banner" aria-label={t('dev.banner.label')} className="fixed bottom-24 right-3 z-50 max-w-xs rounded-xl border border-dashed border-mustard bg-[#FBF3DC] p-3 text-xs text-ink shadow-lg lg:bottom-4 print:hidden">
      <p>
        <strong>{t('dev.banner.title')}</strong> {t('dev.banner.code')} <code className="font-bold">{MOCK_OTP_CODE}</code>
      </p>
      {latest &&
      <p className="mt-1">
          {t('dev.banner.last', { text: latest.text })}
        </p>
      }
      {messages.length > 1 &&
      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 font-semibold text-pine underline" aria-expanded={open}>
          {open ? t('dev.banner.hideRecent') : t('dev.banner.showRecent')}
        </button>
      }
      <DevSessionPanel />
      <button type="button" onClick={resetDemoData} className="mt-2 font-semibold text-clay-dark underline">
        {t('demo.reset')}
      </button>
      {open &&
      <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
          {messages.slice(1).map((m) => <li key={m.id}>{m.to}: {m.text}</li>)}
        </ul>
      }
    </aside>);

}

/**
 * DEV ONLY: shows the test code and the codes/links the mock backend "sent" (SMS, email). Renders nothing
 * unless MOCK_AUTH is on, which is impossible in a production build (see config.ts). Never on the public
 * landing page: nothing internal shows there, even in test mode.
 */
export function DevAuthBanner() {
  return MOCK_AUTH ? <OffLanding /> : null;
}

function OffLanding() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  if (pathname === AUTH_ROUTES.start && !user) return null;
  return <Banner />;
}
