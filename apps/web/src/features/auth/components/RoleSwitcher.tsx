import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { roleLabel } from '../../../i18n/labels';
import type { Role } from '../constants';
import { useAuth } from '../hooks/useAuth';

/**
 * For people with more than one role (e.g. a provider who also books as a customer): switches the active
 * role, which decides the shell and navigation, and goes to that role's home. Renders nothing otherwise.
 */
export function RoleSwitcher({ tone = 'dark', className = '' }: {tone?: 'dark' | 'light';className?: string;}) {
  const { t } = useTranslation('auth');
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();
  const id = useId();
  const [busy, setBusy] = useState(false);
  if (!user || user.roles.length < 2) return null;

  async function change(role: Role) {
    setBusy(true);
    try {
      navigate(await switchRole(role));
    } finally {
      setBusy(false);
    }
  }

  const select =
  tone === 'dark' ?
  'border-white/20 bg-pine-deep text-white focus:ring-white/40' :
  'border-line bg-white text-ink focus:ring-pine/30';
  return (
    <div className={className}>
      <label htmlFor={id} className={`block text-xs font-bold uppercase tracking-wider ${tone === 'dark' ? 'text-white/50' : 'text-muted'}`}>
        {t('account.usingAs')}
      </label>
      <select
        id={id}
        value={user.activeRole}
        disabled={busy}
        onChange={(e) => void change(e.target.value as Role)}
        className={`mt-1 w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-60 ${select}`}>

        {user.roles.map((r) =>
        <option key={r} value={r}>{roleLabel(r)}</option>
        )}
      </select>
    </div>);

}
