import type { TFunction } from 'i18next';
import i18n from './index';
import { DEFAULT_LANGUAGE, isAppLanguage, type AppLanguage } from './config';
import { findUser, findUserByVendorId } from '../features/auth/services/authBackend';

/*
 * Messages sent to someone (in-app updates, push, SMS, booking and renewal reminders) are written in
 * THEIR saved language, not the language of whoever triggered them. A real backend would read
 * user.language from its database; the mock reads the mock accounts.
 */

/**
 * The saved language of a customer (by user id) or a vendor (by vendor id). Recipients without an
 * account here (seeded demo customers, associations) get the default language.
 */
export function recipientLanguage(party: 'customer' | 'vendor', recipientId: string): AppLanguage {
  const user = party === 'vendor' ? findUserByVendorId(recipientId) : findUser(recipientId);
  return user && isAppLanguage(user.language) ? user.language : DEFAULT_LANGUAGE;
}

/** A translate function fixed to one language, for writing a message to someone else. */
export const tIn = (language: AppLanguage): TFunction => i18n.getFixedT(language);
