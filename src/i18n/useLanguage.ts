import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/hooks/useAuth';
import { updateAccount } from '../features/auth/services/accountService';
import { APP_LANGUAGES, isAppLanguage, type AppLanguage } from './config';
import { storeLanguage } from './detect';
import { applyLanguage } from './languageLock';

/**
 * The UI language and how to change it. Changing it updates every screen at once (no reload), sets
 * <html lang>, and is remembered: in localStorage for everyone, and on the profile (user.language) for
 * signed-in users, so their messages and reminders come in that language too.
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const language: AppLanguage = isAppLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';

  const setLanguage = useCallback(async (next: AppLanguage) => {
    await applyLanguage(next);
    storeLanguage(next);
    if (user && user.language !== next) {
      // Best effort: the screen has already switched; the profile catches up.
      await updateAccount({ name: user.name, language: next }).catch(() => undefined);
    }
  }, [user]);

  return { language, setLanguage, languages: APP_LANGUAGES };
}
