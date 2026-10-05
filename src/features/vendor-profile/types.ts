import type { z } from 'zod';
import type { PROFILE_SECTION } from './constants';
import type { profileSchema } from './schemas';

export type ProfileSectionId = (typeof PROFILE_SECTION)[keyof typeof PROFILE_SECTION];

/** What the form holds while editing: prices are display strings like "2,000". */
export type ProfileFormValues = z.input<typeof profileSchema>;

/** What a valid form produces after cleaning and parsing. */
export type ProfileFormData = z.output<typeof profileSchema>;

export type ServiceFormValues = ProfileFormValues['services'][number];
