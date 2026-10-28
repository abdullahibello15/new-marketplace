import { ApiError, mockResponse } from '../../../services/mockApi';
import { normalizeNigerianPhone } from '../../../utils/phone';
import { ROLE } from '../../auth/constants';
import { staffUser, type StoredUser } from '../../auth/mock/users';
import { allUsers, deleteUser, endSessionsFor, findUser, findUserByEmail, findUserByPhone, isEmail, saveUser } from '../../auth/services/authBackend';
import { ADMIN_PERMISSION, ADMIN_ROLE, ADMIN_ROLES, isAdminRole, type AdminRole } from '../config/roles';
import { AUDIT_ACTION } from '../constants';
import { mockStaff } from '../mock/staff';
import { requirePermission } from './adminSession';
import { recordAudit } from './auditService';
import type { AdminAccount, AdminUser } from '../types';

/*
 * The Admins page (our backend's side, mocked). Super admin only: every call checks admins.manage first.
 * Staff accounts live in the auth backend (the same accounts people sign in with); invitations that
 * haven't been accepted yet live here, because they have no account until then.
 *
 * ⚠️ The rules below (no acting on yourself, never losing the last Super admin) are what the real backend
 * must enforce on every request too. The UI only hides the buttons.
 */

let invites: AdminAccount[] = mockStaff.filter((s) => s.status === 'invited').map((s) => ({
  id: s.id,
  name: s.name,
  phone: s.phone,
  email: s.email,
  role: s.role,
  status: 'invited',
  lastLoginAt: null,
  addedAt: s.addedAt,
  addedBy: s.addedBy,
  suspendedAt: null
}));
let nextInvite = 1;

const isStaff = (u: StoredUser) => u.roles.includes(ROLE.Admin) && isAdminRole(u.adminRole);

function toAccount(u: StoredUser): AdminAccount {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone || null,
    email: u.email,
    role: u.adminRole as AdminRole,
    status: u.adminSuspendedAt ? 'suspended' : 'active',
    lastLoginAt: u.lastLoginAt,
    addedAt: u.createdAt,
    addedBy: u.adminAddedBy,
    suspendedAt: u.adminSuspendedAt
  };
}

const allAccounts = (): AdminAccount[] => [...allUsers().filter(isStaff).map(toAccount), ...invites];

function accountOrThrow(id: string): AdminAccount {
  const account = allAccounts().find((a) => a.id === id);
  if (!account) throw new ApiError('That admin no longer exists.', 404);
  return account;
}

const target = (a: Pick<AdminAccount, 'id' | 'name'>) => ({ type: 'admin' as const, id: a.id, label: a.name });
const roleLabel = (role: AdminRole) => ADMIN_ROLES[role].label;

/** Active Super admins: the ones who could still manage admins. */
const activeSuperAdmins = () => allAccounts().filter((a) => a.role === ADMIN_ROLE.SuperAdmin && a.status === 'active');

/** Throws when this would leave nobody able to manage admins. */
function keepASuperAdmin(account: AdminAccount, what: string) {
  const supers = activeSuperAdmins();
  if (supers.length <= 1 && supers.some((s) => s.id === account.id)) {
    throw new ApiError(`${account.name} is the last Super admin, so they can’t be ${what}. Make someone else a Super admin first.`, 409);
  }
}

function notYourself(actor: AdminUser, account: AdminAccount, what: string) {
  if (actor.id === account.id) throw new ApiError(`You can’t ${what} yourself. Ask another Super admin.`, 403);
}

/** What the UI may offer for one row. The service checks the same rules again on every action. */
export interface AdminActionRules {
  canChangeRole: boolean;
  canDemote: boolean;
  canSuspend: boolean;
  canReactivate: boolean;
  canRemove: boolean;
  /** Why some actions aren't offered, if any. */
  note: string | null;
}

export function actionRules(account: AdminAccount, actorId: string, accounts: readonly AdminAccount[]): AdminActionRules {
  const self = account.id === actorId;
  const supers = accounts.filter((a) => a.role === ADMIN_ROLE.SuperAdmin && a.status === 'active');
  const lastSuper = supers.length <= 1 && supers.some((s) => s.id === account.id);
  return {
    canChangeRole: !self,
    canDemote: !self && !lastSuper,
    canSuspend: !self && !lastSuper && account.status === 'active',
    canReactivate: account.status === 'suspended',
    canRemove: !self && !lastSuper,
    note: self ?
    'This is you. Another Super admin has to change your role, suspend you or remove you.' :
    lastSuper ?
    'The last Super admin can’t be demoted, suspended or removed.' :
    null
  };
}

/** GET /admin/admins — every staff account and pending invitation. */
export function listAdmins(): Promise<AdminAccount[]> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.ManageAdmins);
    return allAccounts();
  }, 400);
}

export interface InviteAdminInput {
  name: string;
  /** A Nigerian phone number or an email address. */
  contact: string;
  role: AdminRole;
}

/**
 * POST /admin/admins/invitations. MOCK: nothing is actually sent; the invitation shows as "Invited" until
 * acceptInvite is called (the demo button on the admin's page stands in for them opening the link).
 */
export function inviteAdmin(input: InviteAdminInput): Promise<AdminAccount> {
  return mockResponse(() => {
    const actor = requirePermission(ADMIN_PERMISSION.ManageAdmins);
    const name = input.name.trim();
    if (name.length < 2) throw new ApiError('Enter their full name.', 400);
    if (!isAdminRole(input.role)) throw new ApiError('Choose a role.', 400);
    const contact = input.contact.trim();
    const email = contact.includes('@') ? contact.toLowerCase() : null;
    const phone = email ? null : normalizeNigerianPhone(contact);
    if (email ? !isEmail(email) : !phone) throw new ApiError('Enter a Nigerian phone number or an email address.', 400);

    const taken = allAccounts().find((a) => phone && a.phone === phone || email && a.email?.toLowerCase() === email);
    if (taken) throw new ApiError(`${taken.name} already has that ${phone ? 'number' : 'email'} (${taken.status === 'invited' ? 'invited' : 'an admin'}).`, 409);

    const invite: AdminAccount = {
      id: `adm-inv-${Date.now().toString(36)}-${nextInvite++}`,
      name,
      phone,
      email,
      role: input.role,
      status: 'invited',
      lastLoginAt: null,
      addedAt: new Date().toISOString(),
      addedBy: { id: actor.id, name: actor.name },
      suspendedAt: null
    };
    invites = [invite, ...invites];
    recordAudit(actor, AUDIT_ACTION.AdminInvite, target(invite), { details: `Role: ${roleLabel(invite.role)} · Sent to ${phone ?? email}` });
    return invite;
  }, 600);
}

/**
 * MOCK of the invited person opening their link and accepting. Someone who already has a Gwani account
 * with that number or email gets the admin role added to it; anyone else gets a new staff account.
 */
export function acceptInvite(id: string): Promise<AdminAccount> {
  return mockResponse(() => {
    requirePermission(ADMIN_PERMISSION.ManageAdmins);
    const invite = invites.find((i) => i.id === id);
    if (!invite) throw new ApiError('That invitation no longer exists.', 404);
    const existing = (invite.phone ? findUserByPhone(invite.phone) : null) ?? (invite.email ? findUserByEmail(invite.email) : null);
    const now = new Date().toISOString();
    const user = existing ?
    saveUser({ ...existing, roles: [...existing.roles.filter((r) => r !== ROLE.Admin), ROLE.Admin], adminRole: invite.role, adminSuspendedAt: null, adminAddedBy: invite.addedBy }) :
    saveUser(staffUser({ ...invite, addedAt: now, suspendedAt: null, lastLoginAt: null }));
    invites = invites.filter((i) => i.id !== id);
    const account = toAccount(user);
    recordAudit({ id: user.id, name: user.name, role: account.role }, AUDIT_ACTION.AdminInviteAccepted, target(account), { details: `Role: ${roleLabel(account.role)}` });
    return account;
  }, 500);
}

/** PATCH /admin/admins/:id/role */
export function changeAdminRole(id: string, role: AdminRole): Promise<AdminAccount> {
  return mockResponse(() => {
    const actor = requirePermission(ADMIN_PERMISSION.ManageAdmins);
    if (!isAdminRole(role)) throw new ApiError('Choose a role.', 400);
    const account = accountOrThrow(id);
    notYourself(actor, account, 'change the role of');
    if (account.role === role) return account;
    if (account.role === ADMIN_ROLE.SuperAdmin) keepASuperAdmin(account, 'demoted');
    const details = `${roleLabel(account.role)} → ${roleLabel(role)}`;

    let updated: AdminAccount;
    if (account.status === 'invited') {
      updated = { ...account, role };
      invites = invites.map((i) => i.id === id ? updated : i);
    } else {
      const user = findUser(id);
      if (!user) throw new ApiError('That admin no longer exists.', 404);
      updated = toAccount(saveUser({ ...user, adminRole: role }));
    }
    recordAudit(actor, AUDIT_ACTION.AdminRoleChange, target(account), { details });
    return updated;
  }, 500);
}

/** POST /admin/admins/:id/suspend — blocks sign-in and ends their sessions. A reason is required. */
export function suspendAdmin(id: string, reason: string): Promise<AdminAccount> {
  return mockResponse(() => {
    const actor = requirePermission(ADMIN_PERMISSION.ManageAdmins);
    if (!reason.trim()) throw new ApiError('Give a reason for suspending them.', 400);
    const account = accountOrThrow(id);
    notYourself(actor, account, 'suspend');
    if (account.status !== 'active') throw new ApiError(`${account.name} isn’t active, so they can’t be suspended.`, 409);
    keepASuperAdmin(account, 'suspended');
    const user = findUser(id);
    if (!user) throw new ApiError('That admin no longer exists.', 404);
    const updated = toAccount(saveUser({ ...user, adminSuspendedAt: new Date().toISOString() }));
    endSessionsFor(id);
    recordAudit(actor, AUDIT_ACTION.AdminSuspend, target(account), { reason });
    return updated;
  }, 500);
}

/** POST /admin/admins/:id/reactivate */
export function reactivateAdmin(id: string): Promise<AdminAccount> {
  return mockResponse(() => {
    const actor = requirePermission(ADMIN_PERMISSION.ManageAdmins);
    const account = accountOrThrow(id);
    if (account.status !== 'suspended') throw new ApiError(`${account.name} isn’t suspended.`, 409);
    const user = findUser(id);
    if (!user) throw new ApiError('That admin no longer exists.', 404);
    const updated = toAccount(saveUser({ ...user, adminSuspendedAt: null }));
    recordAudit(actor, AUDIT_ACTION.AdminReactivate, target(account));
    return updated;
  }, 500);
}

/**
 * DELETE /admin/admins/:id — a reason is required. Cancels an invitation; for an account, takes away the
 * admin role (and deletes the account if it had no other role, e.g. customer).
 */
export function removeAdmin(id: string, reason: string): Promise<void> {
  return mockResponse(() => {
    const actor = requirePermission(ADMIN_PERMISSION.ManageAdmins);
    if (!reason.trim()) throw new ApiError('Give a reason for removing them.', 400);
    const account = accountOrThrow(id);
    notYourself(actor, account, 'remove');
    keepASuperAdmin(account, 'removed');

    if (account.status === 'invited') {
      invites = invites.filter((i) => i.id !== id);
    } else {
      const user = findUser(id);
      if (!user) throw new ApiError('That admin no longer exists.', 404);
      const roles = user.roles.filter((r) => r !== ROLE.Admin);
      if (roles.length === 0) {
        deleteUser(id);
      } else {
        saveUser({ ...user, roles, activeRole: roles.some((r) => r === user.activeRole) ? user.activeRole : roles[0], adminRole: null, adminSuspendedAt: null });
        endSessionsFor(id);
      }
    }
    recordAudit(actor, AUDIT_ACTION.AdminRemove, target(account), { reason, details: `Was ${roleLabel(account.role)}${account.status === 'invited' ? ' (invitation cancelled)' : ''}` });
  }, 500);
}
