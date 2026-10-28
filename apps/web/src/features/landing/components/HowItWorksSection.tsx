import { Trans, useTranslation } from 'react-i18next';
import { BadgeCheckIcon, CalendarCheckIcon, InboxIcon, SearchIcon, ShieldCheckIcon, UserPlusIcon, type LucideIcon } from 'lucide-react';
import { LANDING_SECTION } from '../constants';
import { Highlight, IconCircle, LandingHeading, Reveal } from './ui';

const AUDIENCES: readonly {key: 'customers' | 'providers';tone: 'teal' | 'orange';icons: readonly LucideIcon[];}[] = [
{ key: 'customers', tone: 'teal', icons: [SearchIcon, CalendarCheckIcon, ShieldCheckIcon] },
{ key: 'providers', tone: 'orange', icons: [UserPlusIcon, BadgeCheckIcon, InboxIcon] }];


/** Three steps for customers (search, book or order, pay safely) and three for providers. */
export function HowItWorksSection() {
  const { t } = useTranslation('landing');
  const id = LANDING_SECTION.HowItWorks;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <LandingHeading id={`${id}-heading`} center>
            <Trans t={t} i18nKey="how.title" components={{ hl: <Highlight /> }} />
          </LandingHeading>
        </Reveal>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {AUDIENCES.map(({ key, tone, icons }) =>
          <Reveal key={key} className="h-full">
              <div className="landing-glass h-full p-6 lg:p-8">
                <h3 className="landing-display text-2xl text-[#16302F]">{t(`how.${key}.heading`)}</h3>
                <ol className="mt-6 space-y-6">
                  {icons.map((Icon, i) =>
                <li key={i} className="flex gap-4">
                      <div className="relative">
                        <IconCircle icon={Icon} tone={tone} />
                        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#1F4B4D] text-xs font-semibold text-white ring-1 ring-[#E6CF95]" aria-hidden="true">{i + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-[#16302F]">
                          <span className="sr-only">{i + 1}. </span>
                          {t(`how.${key}.step${i + 1}.title`)}
                        </p>
                        <p className="mt-1 text-base text-[#55524B]">{t(`how.${key}.step${i + 1}.text`)}</p>
                      </div>
                    </li>
                )}
                </ol>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>);

}
