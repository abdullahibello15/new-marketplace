import { useTranslation } from 'react-i18next';
import { BikeIcon, BriefcaseIcon, ShoppingBagIcon, type LucideIcon } from 'lucide-react';
import { roleDescription, roleLabel } from '../../../i18n/labels';
import { ROLE, ROLE_META, SIGNUP_ROLES, type SignupRole } from '../constants';

const ICONS: Record<SignupRole, LucideIcon> = {
  [ROLE.Customer]: ShoppingBagIcon,
  [ROLE.Provider]: BriefcaseIcon,
  [ROLE.Rider]: BikeIcon
};

/** "How will you use Gwani?": one large card per role, each with an icon and one line about it. */
export function RoleCards({ onSelect, exclude = [], heading }: {onSelect: (role: SignupRole) => void;exclude?: readonly string[];heading?: string;}) {
  const { t } = useTranslation('auth');
  const roles = SIGNUP_ROLES.filter((r) => !exclude.includes(r));
  return (
    <section aria-labelledby="role-heading" className="space-y-4">
      <h1 id="role-heading" className="text-2xl font-extrabold">{heading ?? t('signup.roleHeading')}</h1>
      <ul className="space-y-3">
        {roles.map((role) => {
          const Icon = ICONS[role];
          return (
            <li key={role}>
              <button
                type="button"
                onClick={() => onSelect(role)}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-line bg-white p-5 text-left transition-colors duration-150 hover:border-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">

                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E3EEEC] text-pine" aria-hidden="true">
                  <Icon className="h-7 w-7" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-extrabold">{roleLabel(role, ROLE_META[role].label)}</span>
                  <span className="block text-sm text-muted">{roleDescription(role, ROLE_META[role].description)}</span>
                </span>
              </button>
            </li>);

        })}
      </ul>
    </section>);

}
