import { Link } from 'react-router-dom';
import { ShieldXIcon } from 'lucide-react';
import { buttonClasses } from '../../../components/ui/buttonStyles';
import { ROLE_META } from '../../auth/constants';
import { useAuth } from '../../auth/hooks/useAuth';

/**
 * Shown to a signed-in person without the Admin role who opens /admin (signed-out visitors are sent to
 * the login page first). Staff sign in with their phone number like everyone else.
 */
export function NotAuthorised({ title = 'Not authorised', message }: {title?: string;message?: string;}) {
  const { user, homeFor, signOut } = useAuth();
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-10 font-sans text-ink">
      <section aria-labelledby="no-access-heading" className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 text-center">
        <ShieldXIcon className="mx-auto h-10 w-10 text-clay-dark" aria-hidden="true" />
        <h1 id="no-access-heading" className="mt-3 text-2xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          {message ?? `You’re signed in as ${user?.name ?? 'someone'}${user ? ` (${ROLE_META[user.activeRole].label.toLowerCase()})` : ''}. The admin console is for Gwani staff only.`}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to={homeFor()} className={buttonClasses({ variant: 'secondary' })}>
            Back to Gwani
          </Link>
          <button type="button" onClick={() => void signOut()} className={buttonClasses({ variant: 'outline' })}>
            Sign in as someone else
          </button>
        </div>
      </section>
    </main>);

}
