import i18n from '../i18n';

/** The fallback error message, in the current language (read when it's shown). */
export const genericError = () => i18n.t('common:error.generic');

export function errorMessage(error: unknown, fallback?: string): string {
  return error instanceof Error && error.message ? error.message : fallback ?? genericError();
}
