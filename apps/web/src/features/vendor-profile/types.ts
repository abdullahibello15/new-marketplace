import type { CategoryKind, WorkingHours } from '../../types/marketplace';
import type { z } from 'zod';
import type { PROFILE_SECTION } from './constants';
import type { profileSchema } from './schemas';

export type ProfileSectionId = (typeof PROFILE_SECTION)[keyof typeof PROFILE_SECTION];

/** What the form holds while editing: prices are display strings like "2,000". */
export type ProfileFormValues = z.input<typeof profileSchema>;

/** What a valid form produces after cleaning and parsing. */
export type ProfileFormData = z.output<typeof profileSchema>;

export type ServiceFormValues = ProfileFormValues['services'][number];

/* ---------- Profile completeness (config in completenessConfig.ts) ---------- */

export type CompletenessItemId =
'photo' |
'businessName' |
'tradeCategory' |
'bio' |
'portfolio' |
'services' |
'products' |
'workingHours' |
'serviceAreas' |
'phoneVerified' |
'emailAdded' |
'documentsSubmitted';

export type CompletenessLabel = 'gettingStarted' | 'good' | 'almostThere' | 'complete';

/** Saved profile fields the score reads (the editor passes its unsaved form values in the same shape). */
export interface CompletenessProfile {
  photo: string;
  name: string;
  tradeCategory: string;
  tradeCategoryOther?: string;
  bio?: string;
  gallery: readonly string[];
  services: readonly {minPrice: number;maxPrice: number;}[];
  productCount: number;
  workingHours: WorkingHours;
  serviceAreas: readonly string[];
}

/** Facts from outside the profile: the account and the verification feature. */
export interface CompletenessAccount {
  phoneVerified: boolean;
  emailAdded: boolean;
  documentsSubmitted: boolean;
}

export interface CompletenessInput {
  kind: CategoryKind;
  profile: CompletenessProfile;
  account: CompletenessAccount;
}

export interface CompletenessItem {
  id: CompletenessItemId;
  done: boolean;
  weight: number;
  /** i18n key of the short hint, e.g. "Vendors with 3+ photos get more requests". */
  hint: string;
  link: string;
}

/** Private to the vendor and admins: never sent to customer-facing pages. */
export interface ProfileCompleteness {
  /** 0–100, whole number. */
  score: number;
  /** Only the items that count for this vendor's kind, in config order. */
  items: CompletenessItem[];
}

/** What the vendor's own service call returns: the score plus the account facts (so the editor can score unsaved edits). */
export interface MyProfileCompleteness extends ProfileCompleteness {
  kind: CategoryKind;
  account: CompletenessAccount;
}
