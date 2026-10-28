import type { AdminRole } from '../../admin/config/roles';
import type { Role } from '../constants';

/*
 * MOCK demo accounts (test mode): obviously fake numbers in the +234 800 000 00xx range, example.com
 * emails, and one obviously fake password that only exists in test mode (testMode.ts). Each signs in like
 * everyone else: the customer and vendors with a password, the rider and staff with the phone and the
 * test code. The seed accounts (mock/users.ts, admin/mock/staff.ts) take their numbers from here, and the
 * login screen's dev-only "Demo accounts" panel lists them.
 */

export const DEMO_PHONES = {
  customer: '+2348000000001',
  serviceVendor: '+2348000000002',
  retailVendor: '+2348000000003',
  rider: '+2348000000004',
  superAdmin: '+2348000000010',
  verifier: '+2348000000011',
  support: '+2348000000012',
  moderator: '+2348000000013',
  analyst: '+2348000000014',
  /** Extra staff the Admins page needs (a second Super admin, a suspended verifier). */
  superAdmin2: '+2348000000015',
  suspendedVerifier: '+2348000000016'
} as const;

export interface DemoAccount {
  /** Key under auth:demo.account (the panel's label for it). */
  id: keyof typeof DEMO_PHONES;
  phone: string;
  role: Role;
  adminRole?: AdminRole;
  /**
   * How it signs in: 'password' (customer: email + password; vendors: phone + password) with the
   * test-mode demo password, or 'code' (rider and staff: phone + the test code).
   */
  login: 'password' | 'code';
  /** What goes in the sign-in field: the email (customer) or the phone. */
  identifier: string;
}

/** What the login screen's demo panel lists, in this order. */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
{ id: 'customer', phone: DEMO_PHONES.customer, role: 'customer', login: 'password', identifier: 'aisha@example.com' },
{ id: 'serviceVendor', phone: DEMO_PHONES.serviceVendor, role: 'provider', login: 'password', identifier: DEMO_PHONES.serviceVendor },
{ id: 'retailVendor', phone: DEMO_PHONES.retailVendor, role: 'provider', login: 'password', identifier: DEMO_PHONES.retailVendor },
{ id: 'rider', phone: DEMO_PHONES.rider, role: 'rider', login: 'code', identifier: DEMO_PHONES.rider },
{ id: 'superAdmin', phone: DEMO_PHONES.superAdmin, role: 'admin', adminRole: 'super_admin', login: 'code', identifier: DEMO_PHONES.superAdmin },
{ id: 'verifier', phone: DEMO_PHONES.verifier, role: 'admin', adminRole: 'verifier', login: 'code', identifier: DEMO_PHONES.verifier },
{ id: 'support', phone: DEMO_PHONES.support, role: 'admin', adminRole: 'mediator', login: 'code', identifier: DEMO_PHONES.support },
{ id: 'moderator', phone: DEMO_PHONES.moderator, role: 'admin', adminRole: 'moderator', login: 'code', identifier: DEMO_PHONES.moderator },
{ id: 'analyst', phone: DEMO_PHONES.analyst, role: 'admin', adminRole: 'analyst', login: 'code', identifier: DEMO_PHONES.analyst }];
