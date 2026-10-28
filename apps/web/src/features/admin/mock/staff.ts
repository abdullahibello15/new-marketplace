import { ADMIN_ROLE } from '../config/roles';
import { DEMO_PHONES } from '../../auth/mock/demoAccounts';
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
 * verifier who holds claims, a suspended account and a pending invite. Sign in with the phone numbers
 * (fake demo numbers, mock/demoAccounts.ts) and the test code. Emails are example.com addresses.
 */
export const mockStaff: StaffSeed[] = [
{ ...NGOZI, role: ADMIN_ROLE.SuperAdmin, phone: DEMO_PHONES.superAdmin, email: 'ngozi.eze@example.com', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(0, 8), addedAt: daysAgo(420), addedBy: null },
{ id: 'adm-halima', name: 'Halima Usman', role: ADMIN_ROLE.SuperAdmin, phone: DEMO_PHONES.superAdmin2, email: 'halima.usman@example.com', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(3, 14), addedAt: daysAgo(200), addedBy: NGOZI },
{ id: 'adm-tunde', name: 'Tunde Bako', role: ADMIN_ROLE.Verifier, phone: DEMO_PHONES.verifier, email: 'tunde.bako@example.com', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(0, 10), addedAt: daysAgo(310), addedBy: NGOZI },
{ id: 'adm-yakubu', name: 'Yakubu Danjuma', role: ADMIN_ROLE.Verifier, phone: DEMO_PHONES.suspendedVerifier, email: null, status: 'suspended', suspendedAt: daysAgo(2, 16), lastLoginAt: daysAgo(4, 11), addedAt: daysAgo(150), addedBy: { id: 'adm-halima', name: 'Halima Usman' } },
{ id: 'adm-amina', name: 'Amina Sule', role: ADMIN_ROLE.Mediator, phone: DEMO_PHONES.support, email: 'amina.sule@example.com', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(1, 9), addedAt: daysAgo(290), addedBy: NGOZI },
{ id: 'adm-ifeoma', name: 'Ifeoma Obi', role: ADMIN_ROLE.Moderator, phone: DEMO_PHONES.moderator, email: 'ifeoma.obi@example.com', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(0, 12), addedAt: daysAgo(260), addedBy: NGOZI },
{ id: 'adm-kabir', name: 'Kabir Lawal', role: ADMIN_ROLE.Analyst, phone: DEMO_PHONES.analyst, email: 'kabir.lawal@example.com', status: 'active', suspendedAt: null, lastLoginAt: daysAgo(6, 15), addedAt: daysAgo(120), addedBy: { id: 'adm-halima', name: 'Halima Usman' } },
{ id: 'adm-zainab', name: 'Zainab Bello', role: ADMIN_ROLE.Moderator, phone: null, email: 'zainab.bello@example.com', status: 'invited', suspendedAt: null, lastLoginAt: null, addedAt: daysAgo(1, 13), addedBy: NGOZI }];


export const staffById = (id: string) => mockStaff.find((s) => s.id === id);
