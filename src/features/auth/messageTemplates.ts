import type { AppLanguage } from '../../i18n/config';

type Email = {subject: string;body: string;};
type Wording = {sms: string;email: Email;};

export type AuthMessageId = 'reset_code' | 'password_changed';

/**
 * SMS and email wording for password reset, one version per language (the recipient's saved language;
 * English when no account exists, though then nothing is sent). Placeholders in [brackets]:
 *   [code]     the 6-digit reset code
 *   [minutes]  how long the code works
 *   [support]  how to reach support
 * SMS should fit one 160-character segment once filled in.
 */
export const AUTH_MESSAGE_TEMPLATES: Record<AppLanguage, Record<AuthMessageId, Wording>> = {
  en: {
    reset_code: {
      sms: 'Gwani: Your password reset code is [code]. It expires in [minutes] minutes. Never share it. If you didn’t ask, ignore this.',
      email: {
        subject: 'Your Gwani password reset code',
        body: 'Your password reset code is [code]. It expires in [minutes] minutes.\n\nNever share this code with anyone, including Gwani staff. If you didn’t ask to reset your password, you can ignore this email.'
      }
    },
    password_changed: {
      sms: 'Gwani: Your password was changed. If this wasn’t you, contact support: [support].',
      email: {
        subject: 'Your Gwani password was changed',
        body: 'Your password was changed and you were signed out on your other devices.\n\nIf this wasn’t you, contact support straight away: [support].'
      }
    }
  },
  ha: {
    reset_code: {
      sms: 'Gwani: Lambar sake saita kalmar sirrinka ita ce [code]. Za ta ƙare cikin minti [minutes]. Kada ka ba kowa. Idan ba kai ka nema ba, ka yi watsi da wannan.',
      email: {
        subject: 'Lambar sake saita kalmar sirrinka ta Gwani',
        body: 'Lambar sake saita kalmar sirrinka ita ce [code]. Za ta ƙare cikin minti [minutes].\n\nKada ka ba kowa wannan lamba, har da ma’aikatan Gwani. Idan ba kai ka nemi sake saita kalmar sirri ba, ka yi watsi da wannan imel.'
      }
    },
    password_changed: {
      sms: 'Gwani: An canza kalmar sirrinka. Idan ba kai ba ne, tuntuɓi tallafi: [support].',
      email: {
        subject: 'An canza kalmar sirrinka ta Gwani',
        body: 'An canza kalmar sirrinka, kuma an fitar da kai daga sauran na’urorinka.\n\nIdan ba kai ba ne, tuntuɓi tallafi nan da nan: [support].'
      }
    }
  }
};

/** Support contact used in security notices. PLACEHOLDER: confirm the real support line. */
export const SUPPORT_CONTACT = 'support@gwani.ng';

export function renderAuthMessage(language: AppLanguage, id: AuthMessageId, values: Record<string, string | number>): {sms: string;email: Email;} {
  const fill = (text: string) => text.replace(/\[(\w+)\]/g, (match, key: string) => key in values ? String(values[key]) : match);
  const w = AUTH_MESSAGE_TEMPLATES[language][id];
  return { sms: fill(w.sms), email: { subject: fill(w.email.subject), body: fill(w.email.body) } };
}
