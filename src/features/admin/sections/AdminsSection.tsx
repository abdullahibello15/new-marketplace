import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { SearchXIcon, UserPlusIcon, UsersRoundIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageContainer } from '../../../components/ui/PageContainer';
import { SearchInput } from '../../../components/ui/SearchInput';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { AdminRoleBadge, AdminStatusBadge } from '../components/admins/AdminBadges';
import { InviteAdminDialog } from '../components/admins/InviteAdminDialog';
import { ADMIN_ROLES, type AdminRole } from '../config/roles';
import { ADMIN_ROUTES, ADMIN_STATUS_META } from '../constants';
import { inviteAdmin, listAdmins } from '../services/adminAccountService';
import type { AdminAccount, AdminStatus } from '../types';

const select = `${field} ${ok} py-2.5`;
type Sort = 'name' | 'last_login';

const when = (iso: string | null, pattern = 'd MMM yyyy') => iso ? format(new Date(iso), pattern) : null;

/** Newest login first; never signed in goes last. */
const byLastLogin = (a: AdminAccount, b: AdminAccount) => (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? '') || a.name.localeCompare(b.name);

/**
 * /admin/admins — every staff account and pending invitation. Super admin only (the route, the sidebar and
 * the service all check admins.manage; the real backend must check it too).
 */
export function AdminsSection() {
  const { data, status, error, reload, setData } = useAsyncData(listAdmins);
  const toast = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<AdminRole | 'all'>('all');
  const [state, setState] = useState<AdminStatus | 'all'>('all');
  const [sort, setSort] = useState<Sort>('name');
  const [inviting, setInviting] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const matches = (a: AdminAccount) =>
    !q ||
    a.name.toLowerCase().includes(q) ||
    !!a.email?.toLowerCase().includes(q) ||
    // Phones are stored as +234…; match "0803…" and "803…" too.
    digits.length >= 3 && !!a.phone && (a.phone.includes(digits) || a.phone.includes(digits.replace(/^0/, '')));
    return (data ?? []).
    filter((a) => (role === 'all' || a.role === role) && (state === 'all' || a.status === state) && matches(a)).
    sort(sort === 'name' ? (a, b) => a.name.localeCompare(b.name) : byLastLogin);
  }, [data, query, role, state, sort]);

  const clearFilters = () => {
    setQuery('');
    setRole('all');
    setState('all');
  };

  function renderBody() {
    if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data) return <LoadingState label="Loading admins" rows={6} rowClassName="h-14" />;
    if (rows.length === 0) {
      return data.length === 0 ?
      <EmptyState icon={UsersRoundIcon} title="No admins yet" description="Invite your first staff member." /> :
      <EmptyState icon={SearchXIcon} title="No admins match" action={<Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>} />;
    }
    return (
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <caption className="sr-only">Gwani admins. Select a name to see their details and manage them.</caption>
          <thead className="border-b border-line bg-cream text-xs font-bold uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3" aria-sort={sort === 'name' ? 'ascending' : undefined}>Name</th>
              <th scope="col" className="px-4 py-3">Phone</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Role</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3" aria-sort={sort === 'last_login' ? 'descending' : undefined}>Last login</th>
              <th scope="col" className="px-4 py-3">Added</th>
              <th scope="col" className="px-4 py-3">Added by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((a) =>
            <tr key={a.id} onClick={() => navigate(ADMIN_ROUTES.admin(a.id))} className="cursor-pointer hover:bg-cream/60">
                <th scope="row" className="px-4 py-3 font-semibold">
                  <Link to={ADMIN_ROUTES.admin(a.id)} onClick={(e) => e.stopPropagation()} className="hover:underline focus-visible:underline">
                    {a.name}
                  </Link>
                </th>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{a.phone ?? <span className="text-muted">—</span>}</td>
                <td className="px-4 py-3">{a.email ?? <span className="text-muted">—</span>}</td>
                <td className="px-4 py-3"><AdminRoleBadge role={a.role} /></td>
                <td className="px-4 py-3"><AdminStatusBadge status={a.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{when(a.lastLoginAt, 'd MMM yyyy, h:mm a') ?? 'Never'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{when(a.addedAt)}</td>
                <td className="px-4 py-3 text-muted">{a.addedBy?.name ?? 'Founding staff'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>);

  }

  return (
    <>
      <PageHeader
        title="Admins"
        subtitle="Staff who can use the admin console, their roles and status."
        action={<Button icon={UserPlusIcon} onClick={() => setInviting(true)}>Invite admin</Button>} />

      <PageContainer className="space-y-4">
        <section aria-label="Filter admins" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_160px_170px] lg:items-end">
          <div className="sm:col-span-2 lg:col-span-1">
            <SearchInput value={query} onChange={setQuery} label="Search name, phone or email" />
          </div>
          <div>
            <label htmlFor="admins-role" className={labelClass}>Role</label>
            <select id="admins-role" className={select} value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="all">All roles</option>
              {Object.entries(ADMIN_ROLES).map(([id, r]) =>
              <option key={id} value={id}>{r.label}</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="admins-status" className={labelClass}>Status</label>
            <select id="admins-status" className={select} value={state} onChange={(e) => setState(e.target.value as typeof state)}>
              <option value="all">All statuses</option>
              {Object.entries(ADMIN_STATUS_META).map(([id, s]) =>
              <option key={id} value={id}>{s.label}</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="admins-sort" className={labelClass}>Sort by</label>
            <select id="admins-sort" className={select} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="name">Name (A–Z)</option>
              <option value="last_login">Last login (newest)</option>
            </select>
          </div>
        </section>
        {data && <p className="text-sm text-muted" aria-live="polite">{rows.length} of {data.length} admins</p>}
        {renderBody()}
      </PageContainer>

      <InviteAdminDialog
        open={inviting}
        onCancel={() => setInviting(false)}
        onConfirm={async (input) => {
          try {
            const invite = await inviteAdmin(input);
            setData((list) => [invite, ...list]);
            toast.success(`Invitation sent to ${invite.name}.`);
            return true;
          } catch (e) {
            toast.error(errorMessage(e));
            return false;
          }
        }} />

    </>);

}
