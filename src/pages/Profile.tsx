import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BellIcon, ChevronRightIcon, LineChartIcon, UserPlusIcon, UsersIcon } from 'lucide-react';
import { LanguageSelector } from '../components/LanguageSelector';
import { roleLabel } from '../i18n/labels';
import { REMINDER_ROUTES } from '../features/reminders/constants';
import { PageHeader } from '../components/PageHeader';
import { useJobs } from '../contexts/JobsContext';
import { formatLocalPhone } from '../utils/phone';
import { AUTH_ROUTES, ROLE, ROLE_META } from '../features/auth/constants';
import { useAuth } from '../features/auth/hooks/useAuth';
import { AccountSecurityCard } from '../features/auth/components/AccountSecurityCard';
import { RoleSwitcher } from '../features/auth/components/RoleSwitcher';

const linkCard =
'mt-4 flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-4 transition-colors duration-150 hover:border-pine/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 lg:max-w-2xl lg:px-5';

/** /profile — the signed-in customer's account (the route requires sign-in). */
export function Profile() {
  const { t } = useTranslation();
  const { jobs } = useJobs();
  const { user } = useAuth();
  if (!user) return null;
  const rows = [
  { label: t('profile.phone'), value: `${formatLocalPhone(user.phone)}${user.phoneVerified ? ' ✓' : ''}` },
  { label: t('profile.address'), value: user.address ?? t('profile.notSet') },
  { label: t('profile.jobsBooked'), value: String(jobs.length) }];

  const canAdd = [ROLE.Customer, ROLE.Provider, ROLE.Rider].some((r) => !user.roles.includes(r));

  return (
    <>
      <PageHeader title={user.name} subtitle={user.area ?? undefined} />
      <div className="mx-auto max-w-6xl space-y-4 px-5 py-6 lg:px-10 lg:py-8">
        <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white lg:max-w-2xl">
          {rows.map((r) =>
          <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-4 lg:px-5">
              <dt className="text-sm font-semibold text-muted">{r.label}</dt>
              <dd className="text-right text-[15px] font-bold text-ink">{r.value}</dd>
            </div>
          )}
        </dl>

        <section aria-labelledby="language-heading" className="rounded-2xl border border-line bg-white p-4 lg:max-w-2xl lg:p-5">
          <h2 id="language-heading" className="font-bold">{t('language.label')}</h2>
          <p className="mt-0.5 text-sm text-muted">{t('profile.languageHint')}</p>
          <LanguageSelector variant="buttons" className="mt-3" />
        </section>

        <AccountSecurityCard />

        <section aria-labelledby="roles-heading" className="rounded-2xl border border-line bg-white p-4 lg:max-w-2xl lg:p-5">
          <h2 id="roles-heading" className="flex items-center gap-2 font-bold"><UsersIcon className="h-5 w-5 text-pine" aria-hidden="true" />{t('profile.roles')}</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {user.roles.map((r) => <li key={r} className="rounded-full bg-sand px-3 py-1 font-semibold">{roleLabel(r, ROLE_META[r].label)}</li>)}
          </ul>
          <RoleSwitcher tone="light" className="mt-3 max-w-xs" />
          {canAdd &&
          <Link to={AUTH_ROUTES.addRole} className="mt-3 inline-flex items-center gap-2 font-semibold text-pine underline underline-offset-2">
              <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
              {t('profile.addRole')}
            </Link>
          }
        </section>

        <Link to={REMINDER_ROUTES.customerPreferences} className={linkCard}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3EEEC] text-pine" aria-hidden="true">
            <BellIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">{t('profile.notifications')}</p>
            <p className="text-sm text-muted">{t('profile.notificationsText')}</p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-muted" aria-hidden="true" />
        </Link>
        <Link to="/investor" className={linkCard}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3EEEC] text-pine" aria-hidden="true">
            <LineChartIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">{t('profile.investor')}</p>
            <p className="text-sm text-muted">{t('profile.investorText')}</p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-muted" aria-hidden="true" />
        </Link>
      </div>
    </>);

}
