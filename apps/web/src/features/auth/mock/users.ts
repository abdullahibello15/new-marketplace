import { mockStaff } from '../../admin/mock/staff';
import type { AdminRole } from '../../admin/config/roles';
import { MOCK_DEMO_PASSWORD } from '../config';
import { ROLE } from '../constants';
import { DEMO_PHONES } from './demoAccounts';
import type { DraftVendorInput } from '../../vendor-profile/utils/draftVendor';
import type { User } from '../types';

/*
 * MOCK accounts the demo starts with (numbers from mock/demoAccounts.ts: obviously fake). Sign in with any
 * of these phone numbers; in test mode the code is the test code shown on the OTP screen. Seeded jobs,
 * orders, payments and the vendor portal belong to these accounts, so every part of the app has data.
 */

/** The demo customer: the seeded jobs, orders and payments are hers. */
export const DEMO_CUSTOMER = {
  id: 'cust-aisha',
  name: 'Aisha Mohammed',
  phone: DEMO_PHONES.customer,
  address: 'Tunga, behind NEPA office',
  area: 'Minna · Chanchaga LGA'
} as const;

export const DEMO_CUSTOMER_ID = DEMO_CUSTOMER.id;

/** A user record as the (mock) backend stores it. */
export interface StoredUser extends User {
  /** MOCK hash only (see services/authBackend.ts). A real backend stores a slow salted hash and never sends it. */
  passwordHash: string | null;
  /** Providers: what their draft vendor profile was created from (to restore it in this mock after a reload). */
  vendorDraft: DraftVendorInput | null;
}

const created = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const base = {
  phoneVerified: true,
  email: null,
  emailVerified: false,
  language: 'en',
  hasPassword: false,
  adminRole: null,
  adminSuspendedAt: null,
  adminAddedBy: null,
  lastLoginAt: null,
  vendorId: null,
  rider: null,
  address: null,
  area: null,
  passwordHash: null,
  vendorDraft: null,
  providerSignup: null
} as const;

/** A staff-only account (Admin role). Used for the seeded staff and when an invited admin accepts. */
export function staffUser(s: {
  id: string;
  name: string;
  role: AdminRole;
  phone: string | null;
  email: string | null;
  addedAt: string;
  addedBy: {id: string;name: string;} | null;
  suspendedAt: string | null;
  lastLoginAt: string | null;
}): StoredUser {
  return {
    ...base,
    id: s.id,
    roles: [ROLE.Admin],
    activeRole: ROLE.Admin,
    phone: s.phone ?? '',
    phoneVerified: s.phone !== null,
    email: s.email,
    name: s.name,
    adminRole: s.role,
    adminSuspendedAt: s.suspendedAt,
    adminAddedBy: s.addedBy,
    lastLoginAt: s.lastLoginAt,
    createdAt: s.addedAt
  };
}

/**
 * The demo customer and vendors sign in with a password too: the obviously fake test-mode password
 * (testMode.ts), and only in test mode. In any other build they have no password (phone code only), so
 * no password, real or fake, ships in the app. Stored as a MOCK hash, never as plain text.
 */
function demoPassword(hash: (password: string) => string) {
  return MOCK_DEMO_PASSWORD ? { hasPassword: true, passwordHash: hash(MOCK_DEMO_PASSWORD) } : { hasPassword: false, passwordHash: null };
}

export function seedUsers(hash: (password: string) => string): StoredUser[] {
  return [
  {
    ...base,
    id: DEMO_CUSTOMER.id,
    roles: [ROLE.Customer],
    activeRole: ROLE.Customer,
    phone: DEMO_CUSTOMER.phone,
    name: DEMO_CUSTOMER.name,
    email: 'aisha@example.com',
    emailVerified: true,
    ...demoPassword(hash),
    address: DEMO_CUSTOMER.address,
    area: DEMO_CUSTOMER.area,
    createdAt: created(400)
  },
  {
    // A provider who also books as a customer: shows the role switcher.
    ...base,
    id: 'usr-bala',
    roles: [ROLE.Provider, ROLE.Customer],
    activeRole: ROLE.Provider,
    phone: DEMO_PHONES.serviceVendor,
    name: 'Bala Danladi',
    language: 'ha',
    vendorId: 'bala-plumbing',
    email: 'bala@example.com',
    emailVerified: true,
    ...demoPassword(hash),
    area: 'Minna · Chanchaga LGA',
    createdAt: created(380)
  },
  {
    // A shop (retail vendor) with products, a subscription and orders.
    ...base,
    id: 'usr-fatima-retail',
    roles: [ROLE.Provider],
    activeRole: ROLE.Provider,
    phone: DEMO_PHONES.retailVendor,
    name: 'Fatima Abdullahi',
    vendorId: 'fatima-fresh-foods',
    email: 'fatima@example.com',
    emailVerified: true,
    ...demoPassword(hash),
    area: 'Minna · Chanchaga LGA',
    createdAt: created(540)
  },
  {
    ...base,
    id: 'usr-sani-rider',
    roles: [ROLE.Rider],
    activeRole: ROLE.Rider,
    phone: DEMO_PHONES.rider,
    name: 'Sani Abubakar',
    rider: { lga: 'Bosso', town: 'Maitumbi', vehicle: 'motorbike', plateNumber: 'BSS 123 NG' },
    createdAt: created(20)
  },
  // Gwani staff: same ids as the staff directory, so the audit log and claims line up. Invited staff
  // have no account until they accept.
  ...mockStaff.filter((s) => s.status !== 'invited').map((s) => staffUser({ ...s, suspendedAt: s.status === 'suspended' ? s.suspendedAt : null }))];

}
