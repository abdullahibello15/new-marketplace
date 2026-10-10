import { Link } from 'react-router-dom';
import { ShieldXIcon } from 'lucide-react';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ROLE_META } from '../../auth/constants';
import { useAuth } from '../../auth/hooks/useAuth';
import { ADMIN_ROUTES } from '../constants';

/**
 * Shown to a signed-in person without the Admin role who opens /admin (signed-out visitors are sent to
 * the login page first). Staff sign in with their phone number like everyone else. `inline` is the same
 * message inside the admin layout, for staff who open a page their admin role doesn't include.
 */
export function NotAuthorised({ title = 'Not authorised', message, inline = false }: {title?: string;message?: string;inline?: boolean;}) {
  const { user, homeFor, signOut } = useAuth();
  const Wrapper = inline ? 'div' : 'main';
  return (
    <Wrapper className={`flex items-center justify-center bg-cream px-4 font-sans text-ink ${inline ? 'py-12' : 'min-h-screen py-10'}`}>
      <section aria-labelledby="no-access-heading" className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 text-center">
        <ShieldXIcon className="mx-auto h-10 w-10 text-clay-dark" aria-hidden="true" />
        <h1 id="no-access-heading" className="mt-3 text-2xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          {message ?? `You’re signed in as ${user?.name ?? 'someone'}${user ? ` (${ROLE_META[user.activeRole].label.toLowerCase()})` : ''}. The admin console is for Gwani staff only.`}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to={inline ? ADMIN_ROUTES.home : homeFor()} className={buttonClasses({ variant: 'secondary' })}>
            {inline ? 'Back to the console' : 'Back to Gwani'}
          </Link>
          <button type="button" onClick={() => void signOut()} className={buttonClasses({ variant: 'outline' })}>
            Sign in as someone else
          </button>
        </div>
      </section>
    </Wrapper>);

}
