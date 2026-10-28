import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/hooks/useAuth';
import { storeLanguage } from './detect';
import { applyLanguage } from './languageLock';

/**
 * When someone signs in, the app switches to the language saved on their profile (their choice follows
 * them across devices). Renders nothing.
 */
export function LanguageSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const appliedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      appliedFor.current = null;
      return;
    }
    if (appliedFor.current === user.id) return;
    appliedFor.current = user.id;
    if (user.language !== i18n.resolvedLanguage) {
      void applyLanguage(user.language);
      storeLanguage(user.language);
    }
  }, [user, i18n]);

  return null;
}
