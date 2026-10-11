import { useTranslation } from 'react-i18next';
import { roleLabel } from '../../../i18n/labels';
import { formatLocalPhone } from '../../../utils/phone';
import { ADMIN_ROLES } from '../../admin/config/roles';
import { MOCK_AUTH, MOCK_DEMO_PASSWORD } from '../config';
import { DEMO_ACCOUNTS, type DemoAccount } from '../mock/demoAccounts';
import { resetDemoData } from '../services/demoReset';

interface DemoAccountsPanelProps {
  /** Fills the sign-in form for this account (it still goes through the normal sign-in). */
  onUse: (account: DemoAccount) => void;
}

/**
 * DEV ONLY: the seeded demo accounts on the login screen, with how each signs in and the demo password.
 * "Use this account" only fills in the form; signing in still takes the password or the one-time code,
 * like any real user (no back door). Nothing renders outside test mode.
 */
export function DemoAccountsPanel(props: DemoAccountsPanelProps) {
  return MOCK_AUTH ? <Panel {...props} /> : null;
}

function Panel({ onUse }: DemoAccountsPanelProps) {
  const { t } = useTranslation('auth');
  return (
    <section data-dev-only="demo-accounts" aria-labelledby="demo-heading" className="rounded-xl border border-dashed border-mustard bg-[#FBF3DC] p-3 text-xs">
      <h2 id="demo-heading" className="font-bold">{t('dev.demoTitle')}</h2>
      <p className="mt-0.5 text-muted">{t('dev.demoHint')}</p>
      <p className="mt-1">{t('demo.passwordIs')} <code className="font-bold">{MOCK_DEMO_PASSWORD}</code></p>
      <ul className="mt-2 grid gap-1">
        {DEMO_ACCOUNTS.map((a) =>
        <li key={a.id} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t(`demo.account.${a.id}`)}</span>
              <span className="block text-muted">
                {a.adminRole ? `${roleLabel(a.role)} · ${ADMIN_ROLES[a.adminRole].label}` : roleLabel(a.role)}
                {' · '}
                <span className="tabular-nums">{a.identifier.includes('@') ? a.identifier : formatLocalPhone(a.identifier)}</span>
                {' · '}
                {a.login === 'password' ? t('demo.withPassword') : t('demo.withCode')}
              </span>
            </span>
            <button type="button" onClick={() => onUse(a)} className="shrink-0 rounded-lg bg-sand px-2 py-1 font-bold text-pine hover:bg-line">
              {t('demo.use')}
            </button>
          </li>
        )}
      </ul>
      <button type="button" onClick={resetDemoData} className="mt-2 font-semibold text-clay-dark underline">{t('demo.reset')}</button>
    </section>);

}
