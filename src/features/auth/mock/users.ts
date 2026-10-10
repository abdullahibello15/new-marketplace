import { mockStaff } from '../../admin/mock/staff';
import { ROLE } from '../constants';
import type { DraftVendorInput } from '../../vendor-profile/utils/draftVendor';
import type { User } from '../types';

/*
 * MOCK accounts the demo starts with. Sign in with any of these phone numbers; in the dev server the code
 * is the test code shown in the dev banner. (Seeded jobs, orders, payments and the vendor portal belong
 * to these accounts.)
 */

/** The demo customer: the seeded jobs, orders and payments are hers. */
export const DEMO_CUSTOMER = {
  id: 'cust-aisha',
  name: 'Aisha Mohammed',
  phone: '+2348035550142',
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
  vendorId: null,
  rider: null,
  address: null,
  area: null,
  passwordHash: null,
  vendorDraft: null
} as const;

/** Mock password for Aisha's email sign-in: "minna-demo-2026". */
export const DEMO_CUSTOMER_PASSWORD = 'minna-demo-2026';

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
    hasPassword: true,
    passwordHash: hash(DEMO_CUSTOMER_PASSWORD),
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
    phone: '+2348031112233',
    name: 'Bala Danladi',
    language: 'ha',
    vendorId: 'bala-plumbing',
    area: 'Minna · Chanchaga LGA',
    createdAt: created(380)
  },
  {
    ...base,
    id: 'usr-sani-rider',
    roles: [ROLE.Rider],
    activeRole: ROLE.Rider,
    phone: '+2349011112222',
    name: 'Sani Abubakar',
    rider: { lga: 'Bosso', town: 'Maitumbi', vehicle: 'motorbike', plateNumber: 'BSS 123 NG' },
    createdAt: created(20)
  },
  // Gwani staff: same ids as the staff directory, so the audit log and claims line up.
  ...mockStaff.map((s, i): StoredUser => ({
    ...base,
    id: s.id,
    roles: [ROLE.Admin],
    activeRole: ROLE.Admin,
    phone: `+23481000000${String(i + 1).padStart(2, '0')}`,
    name: s.name,
    adminRole: s.role,
    createdAt: created(300)
  }))];

}
