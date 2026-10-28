import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { getAuthSnapshot } from '../session';
import { DEV_TIMING_PRESETS, devTimingPreset, setDevTimingPreset, type DevTimingPreset } from '../sessionConfig';
import { devRejectAccessToken, refreshSession } from '../services/sessionService';

/**
 * DEV ONLY (rendered by DevAuthBanner, which needs VITE_MOCK_AUTH=true in the dev server): shorten token
 * lifetimes to seconds and poke the session, to watch expiry, refresh and the idle warning by hand.
 * Shows expiry times only, never a token.
 */
export function DevSessionPanel() {
  const { t } = useTranslation('auth');
  const { status } = useAuth();
  const [preset, setPreset] = useState<DevTimingPreset>(devTimingPreset);
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const expiresAt = getAuthSnapshot().accessExpiresAt;
  const left = expiresAt ? Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000)) : null;

  return (
    <div className="mt-2 border-t border-dashed border-mustard pt-2">
      <p className="font-bold">{t('dev.session.title')}</p>
      <label className="mt-1 flex items-center gap-2">
        {t('dev.session.timing')}
        <select
          value={preset}
          onChange={(e) => {
            const next = e.target.value as DevTimingPreset;
            setDevTimingPreset(next);
            setPreset(next);
            setNote(t('dev.session.applies'));
          }}
          className="rounded border border-line bg-white px-1 py-0.5">

          {Object.keys(DEV_TIMING_PRESETS).map((p) => <option key={p} value={p}>{t(`dev.session.preset.${p}`)}</option>)}
        </select>
      </label>
      {status === 'signed_in' &&
      <>
          <p className="mt-1">{left === null ? '' : t('dev.session.accessLeft', { count: left })}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
            type="button"
            className="font-semibold text-pine underline"
            onClick={() => void refreshSession().then((u) => setNote(u ? t('dev.session.refreshed') : t('dev.session.refreshFailed')))}>

              {t('dev.session.refreshNow')}
            </button>
            <button
            type="button"
            className="font-semibold text-pine underline"
            onClick={() => {
              devRejectAccessToken();
              setNote(t('dev.session.rejected'));
            }}>

              {t('dev.session.reject')}
            </button>
          </div>
        </>
      }
      {note && <p className="mt-1 text-muted" role="status">{note}</p>}
    </div>);

}
