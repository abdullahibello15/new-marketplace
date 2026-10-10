import { ADMIN_ROLE } from '../config/roles';
import type { AdminStatus, AdminUser } from '../types';

/** A staff member the demo starts with (the Admins page and the sign-in accounts come from this). */
export interface StaffSeed extends AdminUser {
  phone: string | null;
  email: string | null;
  status: AdminStatus;
  suspendedAt: string | null;
  lastLoginAt: string | null;
  addedAt: string;
  addedBy: {id: string;name: string;} | null;
}

const daysAgo = (d: number, hour = 9) => {
  const at = new Date(Date.now() - d * 86_400_000);
  at.setHours(hour, 15, 0, 0);
  return at.toISOString();
};
const NGOZI = { id: 'adm-ngozi', name: 'Ngozi Eze' };

/**
 * MOCK Gwani staff directory: every role, two Super admins (so one can be demoted in the demo), a second
 * verifier who holds claims, a suspended account and a pending invite. Sign in with the phone numbers.
 */
export const mockStaff: StaffSeed[] = [
{ ...NGOZI, role: ADMIN_ROLE.SuperAdmin, phone: '+2348100000001', email: 'ngozi.eze@gwani.ng', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(0, 8), addedAt: daysAgo(420), addedBy: null },
{ id: 'adm-halima', name: 'Halima Usman', role: ADMIN_ROLE.SuperAdmin, phone: '+2348100000007', email: 'halima.usman@gwani.ng', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(3, 14), addedAt: daysAgo(200), addedBy: NGOZI },
{ id: 'adm-tunde', name: 'Tunde Bako', role: ADMIN_ROLE.Verifier, phone: '+2348100000002', email: 'tunde.bako@gwani.ng', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(0, 10), addedAt: daysAgo(310), addedBy: NGOZI },
{ id: 'adm-yakubu', name: 'Yakubu Danjuma', role: ADMIN_ROLE.Verifier, phone: '+2348100000003', email: null, status: 'suspended', suspendedAt: daysAgo(2, 16), lastLoginAt: daysAgo(4, 11), addedAt: daysAgo(150), addedBy: { id: 'adm-halima', name: 'Halima Usman' } },
{ id: 'adm-amina', name: 'Amina Sule', role: ADMIN_ROLE.Mediator, phone: '+2348100000004', email: 'amina.sule@gwani.ng', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(1, 9), addedAt: daysAgo(290), addedBy: NGOZI },
{ id: 'adm-ifeoma', name: 'Ifeoma Obi', role: ADMIN_ROLE.Moderator, phone: '+2348100000005', email: 'ifeoma.obi@gwani.ng', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(0, 12), addedAt: daysAgo(260), addedBy: NGOZI },
{ id: 'adm-kabir', name: 'Kabir Lawal', role: ADMIN_ROLE.Analyst, phone: '+2348100000006', email: 'kabir.lawal@gwani.ng', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(6, 15), addedAt: daysAgo(120), addedBy: { id: 'adm-halima', name: 'Halima Usman' } },
{ id: 'adm-zainab', name: 'Zainab Bello', role: ADMIN_ROLE.Moderator, phone: null, email: 'zainab.bello@gwani.ng', status: 'invited', suspendedAt: null, lastLoginAt: null, addedAt: daysAgo(1, 13), addedBy: NGOZI }];


export const staffById = (id: string) => mockStaff.find((s) => s.id === id);
