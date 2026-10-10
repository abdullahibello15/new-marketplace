import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckIcon, ScrollTextIcon, UserXIcon } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { field, label as labelClass, ok } from '../../../components/vendor/formStyles';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { useToast } from '../../../hooks/useToast';
import { errorMessage } from '../../../lib/errors';
import { ReasonDialog } from '../../jobs/components/ReasonDialog';
import { AdminRoleBadge, AdminStatusBadge } from '../components/admins/AdminBadges';
import { ADMIN_PERMISSION_LABELS, ADMIN_ROLE, ADMIN_ROLES, type AdminRole } from '../config/roles';
import { ADMIN_ROUTES, AUDIT_ACTION_LABELS } from '../constants';
import { useAdminSession } from '../hooks/useAdminSession';
import { acceptInvite, actionRules, changeAdminRole, listAdmins, reactivateAdmin, removeAdmin, suspendAdmin } from '../services/adminAccountService';
import { getAuditForAdmin } from '../services/auditService';
import type { AdminAccount } from '../types';

type Pending = {kind: 'role';role: AdminRole;} | {kind: 'reactivate';} | {kind: 'accept';} | {kind: 'suspend';} | {kind: 'remove';} | null;

const when = (iso: string | null) => iso ? format(new Date(iso), 'd MMM yyyy, h:mm a') : null;

function Detail({ label, children }: {label: string;children: ReactNode;}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>);

}

/** What this admin did, and what was done to their account, newest first. */
function RecentActivity({ adminId, refreshKey }: {adminId: string;refreshKey: number;}) {
  // refreshKey is only a trigger to reload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(() => getAuditForAdmin(adminId), [adminId, refreshKey]);
  const { data, status, error, reload } = useAsyncData(load);
  if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
  if (!data) return <LoadingState label="Loading activity" rows={3} rowClassName="h-12" />;
  if (data.length === 0) return <EmptyState icon={ScrollTextIcon} title="No activity yet" />;
  return (
    <ol className="divide-y divide-line">
      {data.map((e) =>
      <li key={e.id} className="py-2.5 text-sm">
          <p className="font-semibold">
            {AUDIT_ACTION_LABELS[e.action]}
            {e.target.id !== adminId && <span className="font-normal text-muted"> · {e.target.label}</span>}
          </p>
          <p className="text-xs text-muted">
            {e.actor.id === adminId ? 'By them' : `By ${e.actor.name}`} · <time dateTime={e.at}>{when(e.at)}</time>
          </p>
          {e.details && <p className="text-xs text-muted">{e.details}</p>}
          {e.reason && <p className="mt-0.5 text-xs">Reason: {e.reason}</p>}
        </li>
      )}
    </ol>);

}

/** /admin/admins/:id — one admin's profile, role, permissions and recent activity, and the actions on them. */
export function AdminDetailSection() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { admin: me } = useAdminSession();
  const { data, status, error, reload, setData } = useAsyncData(listAdmins);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const account = data?.find((a) => a.id === id) ?? null;
  const [newRole, setNewRole] = useState<AdminRole | ''>('');
  useEffect(() => setNewRole(account?.role ?? ''), [account?.role]);

  /** Runs an action; on success updates the row, logs a toast and reloads the activity. */
  async function run(action: () => Promise<AdminAccount | void>, success: string): Promise<boolean> {
    setBusy(true);
    try {
      const updated = await action();
      toast.success(success);
      if (updated) {
        // An accepted invite gets a new id (their account), so swap the row and follow it.
        setData((list) => list.map((a) => a.id === id ? updated : a));
        if (updated.id !== id) navigate(ADMIN_ROUTES.admin(updated.id), { replace: true });
      }
      setRefreshKey((k) => k + 1);
      setPending(null);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function renderBody() {
    if (status === 'error' && !data) return <ErrorState message={error ?? ''} onRetry={reload} />;
    if (!data || !me) return <LoadingState label="Loading admin" rows={3} rowClassName="h-32" />;
    if (!account) {
      return <EmptyState icon={UserXIcon} title="Admin not found" description="They may have been removed." action={<Button variant="secondary" size="sm" onClick={() => navigate(ADMIN_ROUTES.admins)}>Back to admins</Button>} />;
    }
    const rules = actionRules(account, me.id, data);
    const role = ADMIN_ROLES[account.role];
    const roleOptionDisabled = (r: AdminRole) => r !== ADMIN_ROLE.SuperAdmin && account.role === ADMIN_ROLE.SuperAdmin && !rules.canDemote;

    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section aria-labelledby="profile-heading" className="rounded-2xl border border-line bg-white p-5">
            <h2 id="profile-heading" className="text-lg font-extrabold">Profile</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <Detail label="Phone"><span className="font-mono text-sm">{account.phone ?? '—'}</span></Detail>
              <Detail label="Email">{account.email ?? '—'}</Detail>
              <Detail label="Role"><AdminRoleBadge role={account.role} /></Detail>
              <Detail label="Status">
                <AdminStatusBadge status={account.status} />
                {account.suspendedAt && <span className="ml-2 text-xs text-muted">since {when(account.suspendedAt)}</span>}
              </Detail>
              <Detail label="Last login">{when(account.lastLoginAt) ?? 'Never'}</Detail>
              <Detail label="Added">{when(account.addedAt)} by {account.addedBy?.name ?? 'founding staff'}</Detail>
            </dl>
          </section>

          <section aria-labelledby="permissions-heading" className="rounded-2xl border border-line bg-white p-5">
            <h2 id="permissions-heading" className="text-lg font-extrabold">What a {role.label} can do</h2>
            <p className="mt-1 text-sm text-muted">{role.description}</p>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {role.permissions.map((p) =>
              <li key={p} className="flex items-start gap-2 text-sm">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-pine" aria-hidden="true" />
                  {ADMIN_PERMISSION_LABELS[p]}
                </li>
              )}
            </ul>
          </section>

          <section aria-labelledby="activity-heading" className="rounded-2xl border border-line bg-white p-5">
            <h2 id="activity-heading" className="text-lg font-extrabold">Recent activity</h2>
            <p className="mt-1 text-sm text-muted">From the audit log.</p>
            <div className="mt-2"><RecentActivity adminId={account.id} refreshKey={refreshKey} /></div>
          </section>
        </div>

        <aside aria-labelledby="manage-heading" className="h-fit space-y-5 rounded-2xl border border-line bg-white p-5">
          <h2 id="manage-heading" className="text-lg font-extrabold">Manage</h2>
          {rules.note && <p className="rounded-xl bg-cream p-3 text-sm text-muted">{rules.note}</p>}

          {account.status === 'invited' &&
          <div className="space-y-2">
              <p className="text-sm text-muted">Waiting for {account.name} to accept the invitation sent to {account.phone ?? account.email}.</p>
              <Button variant="secondary" fullWidth onClick={() => setPending({ kind: 'accept' })}>
                Mark as accepted (demo)
              </Button>
            </div>
          }

          {rules.canChangeRole &&
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newRole && newRole !== account.role) setPending({ kind: 'role', role: newRole });
            }}>

              <label htmlFor="admin-role" className={labelClass}>Role</label>
              <select id="admin-role" className={`${field} ${ok} py-2.5`} value={newRole} onChange={(e) => setNewRole(e.target.value as AdminRole)}>
                {Object.entries(ADMIN_ROLES).map(([r, c]) =>
              <option key={r} value={r} disabled={roleOptionDisabled(r as AdminRole)}>{c.label}</option>
              )}
              </select>
              <Button type="submit" variant="secondary" fullWidth disabled={!newRole || newRole === account.role}>
                Change role
              </Button>
            </form>
          }

          <div className="space-y-2 border-t border-line pt-4">
            {rules.canSuspend && <Button variant="outline" fullWidth onClick={() => setPending({ kind: 'suspend' })}>Suspend</Button>}
            {rules.canReactivate && <Button variant="secondary" fullWidth onClick={() => setPending({ kind: 'reactivate' })}>Reactivate</Button>}
            {rules.canRemove && <Button variant="danger" fullWidth onClick={() => setPending({ kind: 'remove' })}>{account.status === 'invited' ? 'Cancel invitation' : 'Remove admin'}</Button>}
          </div>
        </aside>
      </div>);

  }

  const name = account?.name ?? 'this admin';
  const confirm =
  pending?.kind === 'role' ?
  {
    title: `Change ${name}’s role?`,
    description: `${ADMIN_ROLES[account?.role ?? pending.role].label} → ${ADMIN_ROLES[pending.role].label}. Their sidebar and permissions change on their next request.`,
    label: 'Change role',
    act: () => run(() => changeAdminRole(id, pending.role), `${name} is now ${ADMIN_ROLES[pending.role].label}.`)
  } :
  pending?.kind === 'reactivate' ?
  { title: `Reactivate ${name}?`, description: 'They can sign in to the admin console again.', label: 'Reactivate', act: () => run(() => reactivateAdmin(id), `${name} was reactivated.`) } :
  pending?.kind === 'accept' ?
  { title: `Mark ${name}’s invitation as accepted?`, description: 'Demo only: stands in for them opening the link. Creates their staff account.', label: 'Mark accepted', act: () => run(() => acceptInvite(id), `${name} joined the admin console.`) } :
  null;
  const reason = pending?.kind === 'suspend' || pending?.kind === 'remove' ? pending.kind : null;

  return (
    <>
      <PageHeader
        title={account?.name ?? 'Admin'}
        subtitle={account ? ADMIN_ROLES[account.role].label : undefined}
        backTo={{ to: ADMIN_ROUTES.admins, label: 'Admins' }}
        action={account ? <AdminStatusBadge status={account.status} /> : undefined} />

      <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-10 lg:py-8">{renderBody()}</div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        description={confirm?.description}
        confirmLabel={confirm?.label ?? ''}
        loading={busy}
        onConfirm={() => void confirm?.act()}
        onCancel={() => setPending(null)} />

      <ReasonDialog
        open={reason !== null}
        title={reason === 'suspend' ? `Suspend ${name}?` : account?.status === 'invited' ? `Cancel ${name}’s invitation?` : `Remove ${name}?`}
        description={
        reason === 'suspend' ?
        'They’re signed out straight away and can’t sign in until a Super admin reactivates them.' :
        'They lose access to the admin console. This can’t be undone; you’d have to invite them again.'
        }
        reasonLabel="Reason (saved in the audit log)"
        confirmLabel={reason === 'suspend' ? 'Suspend' : account?.status === 'invited' ? 'Cancel invitation' : 'Remove admin'}
        required
        onCancel={() => setPending(null)}
        onConfirm={async (text) => {
          if (reason === 'suspend') return run(() => suspendAdmin(id, text), `${name} was suspended.`);
          const done = await run(() => removeAdmin(id, text), `${name} was removed.`);
          if (done) navigate(ADMIN_ROUTES.admins);
          return done;
        }} />

    </>);

}
