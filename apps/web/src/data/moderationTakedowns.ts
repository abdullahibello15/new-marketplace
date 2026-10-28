/**
 * MOCK: content Gwani's moderators removed before the demo starts (their appeals are waiting in the admin
 * moderation queue, see features/admin/mock/moderation.ts). The vendor store starts without this content,
 * so public pages are consistent from the first load. An overturned appeal puts it back from the seed data.
 */
export const REMOVED_PHOTO_PLACEHOLDER = '/admin-docs/photo-removed.svg';

export interface InitialTakedown {
  vendorId: string;
  kind: 'profile_photo' | 'portfolio_photo' | 'product';
  /** The photo URL, or the product id. */
  targetId: string;
}

export const INITIAL_TAKEDOWNS: readonly InitialTakedown[] = [
{ vendorId: 'danladi-carpentry', kind: 'portfolio_photo', targetId: '/7dc19955-5e58-4910-a155-bea401f35289.jpg' },
{ vendorId: 'abdullahi-mechanic', kind: 'profile_photo', targetId: '/7dc19955-5e58-4910-a155-bea401f35289.jpg' },
{ vendorId: 'kure-market-grocery', kind: 'product', targetId: 'kure-market-grocery-p3' },
{ vendorId: 'chidi-carpentry', kind: 'portfolio_photo', targetId: '/7dc19955-5e58-4910-a155-bea401f35289.jpg' }];
