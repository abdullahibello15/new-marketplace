import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { LaptopIcon, MonitorSmartphoneIcon, SmartphoneIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { formatDate } from '../../../utils/format';
import { errorMessage } from '../errors';
import { useAuth } from '../hooks/useAuth';
import { getSessions, revokeAllOtherSessions, revokeSession } from '../services/sessionService';
import { deviceDisplayName, deviceParts } from '../utils/device';
import type { SessionInfo } from '../types';

const PHONES = new Set(['Android', 'iPhone']);

function DeviceIcon({ userAgent }: {userAgent: string;}) {
  const { system } = deviceParts(userAgent);
  const Icon = system && PHONES.has(system) ? SmartphoneIcon : system ? LaptopIcon : MonitorSmartphoneIcon;
  return <Icon className="mt-0.5 h-6 w-6 shrink-0 text-pine" aria-hidden="true" />;
}

/**
 * /account/sessions — every device signed in to this account (for every role): device, rough location,
 * last active and when it signed in, with "This device" marked. Sign out any other device, or all of them.
 */
export function ActiveSessionsSection() {
  const { t } = useTranslation('auth');
  const { homeFor } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, status, error, reload, setData } = useAsyncData(getSessions);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const others = (data ?? []).filter((s) => !s.current);

  async function signOutOne(s: SessionInfo) {
    setBusy(s.id);
    try {
      await revokeSession(s.id);
      setData((list) => list.filter((x) => x.id !== s.id));
      toast.success(t('sessions.toastOne', { device: deviceDisplayName(s.userAgent, t) }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function signOutOthers() {
    setBusy('all');
    try {
      const count = await revokeAllOtherSessions();
      setData((list) => list.filter((x) => x.current));
      toast.success(t('sessions.toastAll', { count }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
      setConfirmAll(false);
    }
  }

  function renderList() {
    if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data) return <LoadingState label={t('sessions.loading')} rows={3} rowClassName="h-24" />;
    return (
      <ul className="space-y-3">
        {data.map((s) =>
        <li key={s.id} className={`flex gap-3 rounded-2xl border bg-white p-4 ${s.current ? 'border-pine/40' : 'border-line'}`}>
            <DeviceIcon userAgent={s.userAgent} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                {deviceDisplayName(s.userAgent, t)}
                {s.current && <Badge tone="success">{t('sessions.thisDevice')}</Badge>}
              </p>
              <p className="mt-0.5 text-sm text-muted">{t('sessions.location', { location: s.location })}</p>
              <p className="mt-0.5 text-xs text-muted">
                {s.current ? t('sessions.activeNow') : t('sessions.lastActive', { date: formatDate(s.lastActiveAt, 'd MMM yyyy, HH:mm') })}
                {' · '}
                {t('sessions.signedIn', { date: formatDate(s.createdAt, 'd MMM yyyy') })}
                {!s.remember && ` · ${t('sessions.notRemembered')}`}
              </p>
            </div>
            {!s.current &&
          <Button variant="outline" size="sm" loading={busy === s.id} disabled={busy !== null} onClick={() => void signOutOne(s)} className="self-start">
                {t('sessions.signOut')}
              </Button>
          }
          </li>
        )}
      </ul>);

  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">{t('sessions.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('sessions.intro')}</p>
      </div>
      {renderList()}
      {others.length > 0 &&
      <Button variant="danger" fullWidth loading={busy === 'all'} disabled={busy !== null} onClick={() => setConfirmAll(true)}>
          {t('sessions.signOutAll')}
        </Button>
      }
      <p className="text-xs text-muted">{t('sessions.securityNote')}</p>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" onClick={() => navigate(-1)} className="font-semibold text-pine underline underline-offset-2">{t('sessions.back')}</button>
        <Link to={homeFor()} className="font-semibold text-pine underline underline-offset-2">{t('guard.backHome')}</Link>
      </div>

      <ConfirmDialog
        open={confirmAll}
        title={t('sessions.confirmTitle')}
        description={t('sessions.confirmText', { count: others.length })}
        confirmLabel={t('sessions.signOutAll')}
        cancelLabel={t('sessions.cancel')}
        destructive
        loading={busy === 'all'}
        onConfirm={() => void signOutOthers()}
        onCancel={() => setConfirmAll(false)} />

    </div>);

}
