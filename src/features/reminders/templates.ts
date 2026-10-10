import { addDays, isSameDay } from 'date-fns';
import { formatDateIn } from '../../utils/format';
import type { AppLanguage } from '../../i18n/config';
import type { JobParty } from '../jobs/types';
import type { ReminderMessage, ReminderRuleId, SubscriptionAudience, SubscriptionReminderPhase } from './types';

type Wording = {pushTitle: string;pushBody: string;sms: string;};

/**
 * Every booking reminder's wording, one version per language (picked from the recipient's saved
 * language). Placeholders in [brackets] are filled by renderTemplate:
 *   [service]  what's booked, e.g. "Pipe fitting & repair"
 *   [vendor]   the vendor's business name
 *   [customer] the customer's name
 *   [day]      "today", "tomorrow" or "on Tue 7 Oct", relative to when the reminder goes out
 *   [time]     start time, e.g. "10:00 AM"
 *   [address]  landmark and area, e.g. "Behind NEPA office, Tunga, Minna"
 *   [lead]     how far ahead, from the rule, e.g. "2 hours"
 *   [ref]      the job number, e.g. "#2291"
 * SMS should fit one 160-character segment once filled in; the dev panel flags any that don't.
 */
export const REMINDER_TEMPLATES: Record<AppLanguage, Record<ReminderRuleId, Record<JobParty, Wording>>> = {
  en: {
    day_before: {
      customer: {
        pushTitle: 'Booking tomorrow',
        pushBody: 'Reminder: your [service] with [vendor] is [day] at [time]. [address]',
        sms: 'Gwani: Your [service] with [vendor] is [day] at [time]. [address]'
      },
      vendor: {
        pushTitle: 'Job tomorrow',
        pushBody: 'Reminder: [service] for [customer] is [day] at [time]. [address]',
        sms: 'Gwani: Job [ref] for [customer] is [day] at [time]. [address]'
      }
    },
    two_hours: {
      customer: {
        pushTitle: 'Starting in [lead]',
        pushBody: 'Your [service] with [vendor] starts in [lead], at [time]. [address]',
        sms: 'Gwani: Your [service] with [vendor] starts in [lead], at [time]. [address]'
      },
      vendor: {
        pushTitle: 'Job in [lead]',
        pushBody: '[service] for [customer] starts in [lead], at [time]. [address]',
        sms: 'Gwani: Job [ref] for [customer] starts in [lead], at [time]. [address]'
      }
    }
  },
  ha: {
    day_before: {
      customer: {
        pushTitle: 'Tsari gobe',
        pushBody: 'Tunatarwa: [service] ɗinka da [vendor] [day] da [time]. [address]',
        sms: 'Gwani: [service] ɗinka da [vendor] [day] da [time]. [address]'
      },
      vendor: {
        pushTitle: 'Aiki gobe',
        pushBody: 'Tunatarwa: [service] na [customer] [day] da [time]. [address]',
        sms: 'Gwani: Aiki [ref] na [customer] [day] da [time]. [address]'
      }
    },
    two_hours: {
      customer: {
        pushTitle: 'Zai fara cikin [lead]',
        pushBody: '[service] ɗinka da [vendor] zai fara cikin [lead], da [time]. [address]',
        sms: 'Gwani: [service] ɗinka da [vendor] zai fara cikin [lead], da [time]. [address]'
      },
      vendor: {
        pushTitle: 'Aiki cikin [lead]',
        pushBody: '[service] na [customer] zai fara cikin [lead], da [time]. [address]',
        sms: 'Gwani: Aiki [ref] na [customer] zai fara cikin [lead], da [time]. [address]'
      }
    }
  }
};

export type TemplateValues = Record<'service' | 'vendor' | 'customer' | 'day' | 'time' | 'address' | 'lead' | 'ref', string>;

/** Fills [placeholders]. Unknown ones are left as typed, so a typo shows up in the dev panel instead of vanishing. */
export function renderTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\[(\w+)\]/g, (match, key: string) => key in values ? values[key as keyof TemplateValues] : match).replace(/\s+/g, ' ').trim();
}

/** "today", "tomorrow" or "on Tue 7 Oct" (or the Hausa): the start day as the person reading the reminder sees it. */
export function relativeDay(start: Date, readAt: Date, language: AppLanguage = 'en'): string {
  const ha = language === 'ha';
  if (isSameDay(start, readAt)) return ha ? 'yau' : 'today';
  if (isSameDay(start, addDays(readAt, 1))) return ha ? 'gobe' : 'tomorrow';
  return `${ha ? 'ranar' : 'on'} ${formatDateIn(start, 'EEE d MMM', language)}`;
}

export function renderReminder(ruleId: ReminderRuleId, recipient: JobParty, values: TemplateValues, language: AppLanguage = 'en'): ReminderMessage {
  const t = REMINDER_TEMPLATES[language][ruleId][recipient];
  return { pushTitle: renderTemplate(t.pushTitle, values), pushBody: renderTemplate(t.pushBody, values), sms: renderTemplate(t.sms, values) };
}

/* ---------- Subscription renewal reminders ---------- */

/**
 * Subscription renewal wording, by language, phase (from the end date) and audience. Placeholders:
 *   [vendor]      the vendor's business name
 *   [plan]        the plan, e.g. "Standard"
 *   [expiry]      the end date, e.g. "Fri 16 Oct"
 *   [link]        where to renew, e.g. "https://gwani.ng/pro/subscription"
 *   [association] the association paying the bundle (member and admin wording)
 *   [days]        days until (or since) the end date, e.g. "3 days"
 *   [graceEnd]    when the grace period ends, e.g. "Fri 23 Oct"
 */
export const SUBSCRIPTION_TEMPLATES: Record<AppLanguage, Record<SubscriptionReminderPhase, Record<SubscriptionAudience, Wording>>> = {
  en: {
    before: {
      vendor: {
        pushTitle: 'Your plan ends in [days]',
        pushBody: '[vendor], your [plan] plan ends on [expiry]. Renew to stay visible and keep getting requests.',
        sms: 'Gwani: [vendor], your [plan] plan ends [expiry]. Renew: [link]'
      },
      member: {
        pushTitle: 'Bundle renews in [days]',
        pushBody: '[association] renews your [plan] plan on [expiry]. Nothing for you to pay.',
        sms: 'Gwani: [association] renews your [plan] plan on [expiry]. Nothing to pay. [link]'
      },
      admin: {
        pushTitle: 'Bundle payment due in [days]',
        pushBody: 'The [association] bundle ends on [expiry]. Pay the renewal to keep every member active.',
        sms: 'Gwani: [association] bundle ends [expiry]. Pay renewal: [link]'
      }
    },
    today: {
      vendor: {
        pushTitle: 'Your plan ends today',
        pushBody: '[vendor], your [plan] plan ends today. Renew now: you then get a [days] grace period before your profile is paused.',
        sms: 'Gwani: [vendor], your [plan] plan ends today. Renew: [link]'
      },
      member: {
        pushTitle: 'Bundle ends today',
        pushBody: 'The [association] bundle that pays your [plan] plan ends today. Your association admin needs to renew it.',
        sms: 'Gwani: [association] bundle for your plan ends today. Ask your admin to renew. [link]'
      },
      admin: {
        pushTitle: 'Bundle ends today',
        pushBody: 'The [association] bundle ends today. Pay the renewal so members aren’t paused after the grace period.',
        sms: 'Gwani: [association] bundle ends today. Pay renewal: [link]'
      }
    },
    grace: {
      vendor: {
        pushTitle: 'Grace period: renew by [graceEnd]',
        pushBody: '[vendor], your [plan] plan ended [days] ago. You’re still visible until [graceEnd]; renew before then to avoid a pause.',
        sms: 'Gwani: [vendor], plan ended. Still visible until [graceEnd]. Renew: [link]'
      },
      member: {
        pushTitle: 'Bundle payment overdue',
        pushBody: 'The [association] bundle ended [days] ago. If it isn’t renewed by [graceEnd], your profile is paused.',
        sms: 'Gwani: [association] bundle overdue. Paused after [graceEnd] if not renewed. [link]'
      },
      admin: {
        pushTitle: 'Bundle overdue: pay by [graceEnd]',
        pushBody: 'The [association] bundle ended [days] ago. Members are paused after [graceEnd] unless you renew.',
        sms: 'Gwani: [association] bundle overdue. Members paused after [graceEnd]. Pay: [link]'
      }
    },
    suspended: {
      vendor: {
        pushTitle: 'Your profile is paused',
        pushBody: '[vendor], customers can see you but can’t send new requests. Renew [plan] and you’re back straight away.',
        sms: 'Gwani: [vendor], profile paused: no new requests. Renew to restore: [link]'
      },
      member: {
        pushTitle: 'Your profile is paused',
        pushBody: 'The [association] bundle wasn’t renewed, so new requests are paused. Ask your association admin to renew.',
        sms: 'Gwani: profile paused, [association] bundle not renewed. Ask your admin. [link]'
      },
      admin: {
        pushTitle: 'Members are paused',
        pushBody: 'The [association] bundle wasn’t renewed, so members can’t get new requests. Pay the renewal to restore them all.',
        sms: 'Gwani: [association] members paused. Pay renewal to restore: [link]'
      }
    }
  },
  ha: {
    before: {
      vendor: {
        pushTitle: 'Tsarinka zai ƙare cikin [days]',
        pushBody: '[vendor], tsarinka na [plan] zai ƙare a [expiry]. Sabunta don ka ci gaba da bayyana da samun buƙatu.',
        sms: 'Gwani: [vendor], tsarinka na [plan] zai ƙare [expiry]. Sabunta: [link]'
      },
      member: {
        pushTitle: 'Za a sabunta tsarin ƙungiya cikin [days]',
        pushBody: '[association] za ta sabunta tsarinka na [plan] a [expiry]. Babu abin da za ka biya.',
        sms: 'Gwani: [association] za ta sabunta tsarinka na [plan] a [expiry]. Babu biya. [link]'
      },
      admin: {
        pushTitle: 'Biyan tsarin ƙungiya cikin [days]',
        pushBody: 'Tsarin ƙungiyar [association] zai ƙare a [expiry]. Biya sabuntawa don kowane memba ya ci gaba da aiki.',
        sms: 'Gwani: Tsarin [association] zai ƙare [expiry]. Biya sabuntawa: [link]'
      }
    },
    today: {
      vendor: {
        pushTitle: 'Tsarinka zai ƙare yau',
        pushBody: '[vendor], tsarinka na [plan] zai ƙare yau. Sabunta yanzu: sannan za ka sami rangwamen [days] kafin a dakatar da shafinka.',
        sms: 'Gwani: [vendor], tsarinka na [plan] zai ƙare yau. Sabunta: [link]'
      },
      member: {
        pushTitle: 'Tsarin ƙungiya zai ƙare yau',
        pushBody: 'Tsarin ƙungiyar [association] da ke biyan tsarinka na [plan] zai ƙare yau. Shugaban ƙungiyarka yana buƙatar ya sabunta.',
        sms: 'Gwani: Tsarin [association] na tsarinka zai ƙare yau. Roƙi shugaba ya sabunta. [link]'
      },
      admin: {
        pushTitle: 'Tsarin ƙungiya zai ƙare yau',
        pushBody: 'Tsarin ƙungiyar [association] zai ƙare yau. Biya sabuntawa don kada a dakatar da membobi bayan lokacin rangwame.',
        sms: 'Gwani: Tsarin [association] zai ƙare yau. Biya sabuntawa: [link]'
      }
    },
    grace: {
      vendor: {
        pushTitle: 'Lokacin rangwame: sabunta kafin [graceEnd]',
        pushBody: '[vendor], tsarinka na [plan] ya ƙare [days] da suka wuce. Kana nan a bayyane har zuwa [graceEnd]; sabunta kafin lokacin don kada a dakatar.',
        sms: 'Gwani: [vendor], tsari ya ƙare. A bayyane har [graceEnd]. Sabunta: [link]'
      },
      member: {
        pushTitle: 'Biyan tsarin ƙungiya ya wuce lokaci',
        pushBody: 'Tsarin ƙungiyar [association] ya ƙare [days] da suka wuce. Idan ba a sabunta kafin [graceEnd] ba, za a dakatar da shafinka.',
        sms: 'Gwani: Tsarin [association] ya wuce lokaci. Za a dakatar bayan [graceEnd]. [link]'
      },
      admin: {
        pushTitle: 'Tsarin ƙungiya ya wuce lokaci: biya kafin [graceEnd]',
        pushBody: 'Tsarin ƙungiyar [association] ya ƙare [days] da suka wuce. Za a dakatar da membobi bayan [graceEnd] sai ka sabunta.',
        sms: 'Gwani: Tsarin [association] ya wuce lokaci. Za a dakatar da membobi bayan [graceEnd]. Biya: [link]'
      }
    },
    suspended: {
      vendor: {
        pushTitle: 'An dakatar da shafinka',
        pushBody: '[vendor], abokan ciniki suna ganinka amma ba za su iya aika sababbin buƙatu ba. Sabunta [plan] kuma za ka dawo nan take.',
        sms: 'Gwani: [vendor], an dakatar da shafi: babu sababbin buƙatu. Sabunta: [link]'
      },
      member: {
        pushTitle: 'An dakatar da shafinka',
        pushBody: 'Ba a sabunta tsarin ƙungiyar [association] ba, don haka an dakatar da sababbin buƙatu. Roƙi shugaban ƙungiyarka ya sabunta.',
        sms: 'Gwani: an dakatar da shafi, ba a sabunta tsarin [association] ba. Roƙi shugaba. [link]'
      },
      admin: {
        pushTitle: 'An dakatar da membobi',
        pushBody: 'Ba a sabunta tsarin ƙungiyar [association] ba, don haka membobi ba za su sami sababbin buƙatu ba. Biya sabuntawa don dawo da su duka.',
        sms: 'Gwani: An dakatar da membobin [association]. Biya sabuntawa: [link]'
      }
    }
  }
};

export type SubscriptionTemplateValues = Record<'vendor' | 'plan' | 'expiry' | 'link' | 'association' | 'days' | 'graceEnd', string>;

/** Fills a subscription template. Unknown placeholders are kept as typed, like booking templates. */
export function renderSubscriptionReminder(
phase: SubscriptionReminderPhase,
audience: SubscriptionAudience,
values: SubscriptionTemplateValues,
language: AppLanguage = 'en')
: ReminderMessage {
  const t = SUBSCRIPTION_TEMPLATES[language][phase][audience];
  const fill = (s: string) => s.replace(/\[(\w+)\]/g, (match, key: string) => key in values ? values[key as keyof SubscriptionTemplateValues] : match).replace(/\s+/g, ' ').trim();
  return { pushTitle: fill(t.pushTitle), pushBody: fill(t.pushBody), sms: fill(t.sms) };
}
