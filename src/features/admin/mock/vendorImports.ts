import type { DraftProfile } from '../../profile-claim/types';

/*
 * MOCK history: one earlier bulk import, so the history page has something in it. It's replayed through
 * the real import code on first use (a partner is created, members invited and added to its bundle), so
 * it behaves like any import: resend works, and Undo works for the members who haven't claimed.
 */
export const SEED_IMPORT = {
  daysAgo: 6,
  fileName: 'bida-tailors-union-members.xlsx',
  adminId: 'adm-tunde',
  partner: {
    name: 'Bida Tailors Union',
    adminName: 'Hajiya Zainab Ndagi',
    phone: '+2348034556677',
    email: 'secretary@bidatailors.ng',
    terms: 'Standard plan for every member at the bundle discount; the union pays monthly by transfer. Signed 1 Oct 2026.'
  },
  invite: 'sms' as const,
  rows: [
  { line: 2, profile: { fullName: 'Fatima Ndako', businessName: 'Ndako Fashion House', phone: '+2348061230001', email: null, tradeCategory: 'tailor', lga: 'Bida', town: 'Bida, near Emir’s palace', yearsExperience: 12, bio: 'Bridal and occasion wear, Nupe-style embroidery.', serviceAreas: ['Bida', 'Katcha'] } },
  { line: 3, profile: { fullName: 'Musa Gana', businessName: 'Gana Stitches', phone: '+2348161230002', email: 'gana.stitches@example.com', tradeCategory: 'tailor', lga: 'Bida', town: 'Bida, Old Market road', yearsExperience: 7, bio: 'Kaftans and agbada, fast alterations.', serviceAreas: ['Bida'] } },
  { line: 4, profile: { fullName: 'Hauwa Jiya', businessName: 'Jiya Uniforms', phone: '+2349031230003', email: null, tradeCategory: 'tailor', lga: 'Lavun', town: 'Kutigi', yearsExperience: 5, bio: 'School and staff uniforms in bulk.', serviceAreas: ['Lavun', 'Bida'] } },
  { line: 5, skip: 'Already on Gwani (Bida Royal Tailors); the admin chose Skip.', profile: { fullName: 'Abubakar Bida', businessName: 'Bida Royal Tailors', phone: '+2348039876543', email: null } }] as
  readonly ({line: number;profile: DraftProfile;skip?: undefined;} | {line: number;skip: string;profile: Pick<DraftProfile, 'fullName' | 'businessName' | 'phone' | 'email'>;})[],
  /** Line 2 has already claimed their profile. */
  claimedLines: [2]
};
