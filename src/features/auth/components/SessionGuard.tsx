import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { AUTH_ROUTES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { signOutIdle } from '../services/sessionService';
import { sessionTiming } from '../sessionConfig';
import { broadcastSession, onSessionMessage } from '../sessionSync';
import { idlePhase, idleSecondsLeft, idleTimeoutSeconds } from '../utils/idle';
import type { LoginRedirectState } from './guards';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
/** Tell other tabs about activity at most this often. */
const BROADCAST_EVERY_MS = 15_000;

/** The last sign-out this tab has already sent to login (survives the remount that sign-out causes). */
let handledEndId = 0;

/**
 * Lives inside the router, around every page. (1) When the session ends on its own (expired, idle,
 * signed out in another tab) it sends the person to login with the reason, and back to this page after.
 * (2) The idle timer: no activity in any tab for the role's/screen's timeout (sessionConfig.ts) shows
 * "You'll be signed out in 60 seconds. Stay signed in?", then signs out.
 */
export function SessionGuard() {
  const { t } = useTranslation('auth');
  const { status, user, ended } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const lastActivity = useRef(Date.now());
  const lastBroadcast = useRef(0);
  const [warningLeft, setWarningLeft] = useState<number | null>(null);
  const warningOpen = warningLeft !== null;
  const timing = sessionTiming();
  const timeout = status === 'signed_in' && user ? idleTimeoutSeconds(user.activeRole, location.pathname, timing) : null;

  // (1) Session ended without the person asking here: login, with why, then back.
  useEffect(() => {
    if (status !== 'signed_out' || !ended || ended.id <= handledEndId) return;
    handledEndId = ended.id;
    if (ended.reason === 'logout') return; // They chose to; the sign-out button decides where to go.
    if (location.pathname.startsWith(AUTH_ROUTES.login) || location.pathname === AUTH_ROUTES.staffLogin) return;
    const from = `${location.pathname}${location.search}${location.hash}`;
    // Staff go back to the staff sign-in, everyone else to the usual login.
    const loginPath = location.pathname.startsWith('/admin') ? AUTH_ROUTES.staffLogin : AUTH_ROUTES.login;
    navigate(loginPath, { replace: true, state: { from, reason: ended.reason } satisfies LoginRedirectState });
  }, [status, ended, location, navigate]);

  const markActive = useCallback(() => {
    lastActivity.current = Date.now();
    if (Date.now() - lastBroadcast.current > BROADCAST_EVERY_MS) {
      lastBroadcast.current = Date.now();
      broadcastSession({ type: 'activity' });
    }
  }, []);

  // (2) Activity here and in other tabs. While the warning is up, only "Stay signed in" counts.
  useEffect(() => {
    if (timeout === null) return;
    const onActivity = () => {
      if (!warningOpen) markActive();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const off = onSessionMessage((m) => {
      if (m.type === 'activity') {
        lastActivity.current = Date.now();
        setWarningLeft(null);
      }
    });
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      off();
    };
  }, [timeout, warningOpen, markActive]);

  useEffect(() => {
    if (timeout === null) {
      setWarningLeft(null);
      return;
    }
    const tick = () => {
      const now = Date.now();
      const phase = idlePhase(lastActivity.current, now, timeout, timing.idleWarningSeconds);
      if (phase === 'expired') {
        setWarningLeft(null);
        void signOutIdle();
      } else {
        setWarningLeft(phase === 'warning' ? idleSecondsLeft(lastActivity.current, now, timeout) : null);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timeout, timing.idleWarningSeconds]);

  // A new sign-in starts the idle clock afresh.
  useEffect(() => {
    lastActivity.current = Date.now();
  }, [user?.id]);

  function stay() {
    markActive();
    lastBroadcast.current = 0;
    broadcastSession({ type: 'activity' });
    setWarningLeft(null);
  }

  return (
    <Dialog open={warningOpen} onClose={stay} title={t('session.idleTitle', { count: warningLeft ?? 0 })} description={t('session.idleText')}>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => void signOutIdle()}>{t('session.idleSignOut')}</Button>
        <Button onClick={stay} autoFocus>{t('session.idleStay')}</Button>
      </div>
    </Dialog>);

}
