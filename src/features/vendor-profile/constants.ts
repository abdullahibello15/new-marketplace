import type { ProfileFormValues, ProfileSectionId } from './types';

export const PROFILE_ROUTE = '/pro/profile';

export const PROFILE_SECTION = {
  About: 'about',
  Portfolio: 'portfolio',
  Services: 'services',
  Hours: 'hours',
  Areas: 'areas',
  Fulfilment: 'fulfilment',
  Payments: 'payments'
} as const;

export const PROFILE_SECTIONS: {id: ProfileSectionId;label: string;description: string;}[] = [
{ id: PROFILE_SECTION.About, label: 'About', description: 'Your name, trade and a short intro customers see on your profile.' },
{ id: PROFILE_SECTION.Portfolio, label: 'Portfolio', description: 'Photos of your past work.' },
{ id: PROFILE_SECTION.Services, label: 'Services & prices', description: 'What customers can book, with a price range for each.' },
{ id: PROFILE_SECTION.Hours, label: 'Working hours', description: 'Customers see whether you’re open now. Times are West Africa Time.' },
{ id: PROFILE_SECTION.Areas, label: 'Service area', description: 'The Niger State LGAs where you take jobs.' },
{
  id: PROFILE_SECTION.Fulfilment,
  label: 'Pickup & delivery',
  description: 'How customers get the products they order from your shop. Only the options you turn on show at checkout.'
},
{ id: PROFILE_SECTION.Payments, label: 'Payments', description: 'How customers can pay you. Card, transfer and USSD are always on.' }];


/** Which section each form field lives in, so a failed save can point at the right place. */
export const FIELD_SECTION: Record<keyof ProfileFormValues, ProfileSectionId> = {
  name: PROFILE_SECTION.About,
  tradeCategory: PROFILE_SECTION.About,
  tradeCategoryOther: PROFILE_SECTION.About,
  bio: PROFILE_SECTION.About,
  gallery: PROFILE_SECTION.Portfolio,
  services: PROFILE_SECTION.Services,
  workingHours: PROFILE_SECTION.Hours,
  serviceAreas: PROFILE_SECTION.Areas,
  fulfilment: PROFILE_SECTION.Fulfilment,
  acceptsCash: PROFILE_SECTION.Payments
};

export const profileSectionAnchor = (id: ProfileSectionId) => `profile-${id}`;
export const profileSectionHref = (id: ProfileSectionId) => `${PROFILE_ROUTE}#${profileSectionAnchor(id)}`;

export const NAME_MIN = 2;
export const NAME_MAX = 60;
export const PORTFOLIO_MAX = 10;
export const SERVICES_MAX = 20;
export const SERVICE_NAME_MAX = 60;
export const SERVICE_DESCRIPTION_MAX = 120;
export const SERVICE_PRICE_MAX = 10_000_000;
export const PICKUP_ADDRESS_MIN = 5;
export const PICKUP_ADDRESS_MAX = 150;
export const PICKUP_INSTRUCTIONS_MAX = 200;
export const DELIVERY_FEE_MAX = 50_000;

/** Prefix for services added in this session that the API hasn't assigned an id to yet. */
export const NEW_SERVICE_ID_PREFIX = 'new-';
