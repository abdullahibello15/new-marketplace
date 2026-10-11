import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ChevronDownIcon } from 'lucide-react';
import { LANDING_FAQ, LANDING_SECTION } from '../constants';
import { Highlight, LandingHeading, Reveal } from './ui';

/**
 * The FAQ accordion: each question is a real <button> (Tab to reach, Enter or Space to open) with
 * aria-expanded and aria-controls pointing at its answer. Several can be open at once.
 */
export function FaqSection() {
  const { t } = useTranslation('landing');
  const id = LANDING_SECTION.Faq;
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (key: string) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);else
    next.add(key);
    return next;
  });

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <LandingHeading id={`${id}-heading`} center>
            <Trans t={t} i18nKey="faq.title" components={{ hl: <Highlight /> }} />
          </LandingHeading>
        </Reveal>
        <ul className="mt-10 space-y-3">
          {LANDING_FAQ.map((key) => {
            const expanded = open.has(key);
            const answerId = `faq-${key}-answer`;
            return (
              <li key={key} className={`overflow-hidden rounded-2xl border transition-colors duration-150 motion-reduce:transition-none ${expanded ? 'border-[#1F4B4D]/25 bg-[#E8F1EF]' : 'border-[#EFE7D6] bg-[#FAF6EE]'}`}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={answerId}
                    onClick={() => toggle(key)}
                    className="flex min-h-[56px] w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-extrabold text-[#1C1B18] focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#1F4B4D]/30">

                    <span className="min-w-0">{t(`faq.${key}.q`)}</span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ${expanded ? 'text-[#C0501F]' : 'text-[#1F4B4D]'}`} aria-hidden="true">
                      <ChevronDownIcon className={`h-5 w-5 ${expanded ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                </h3>
                <div id={answerId} hidden={!expanded} className="px-5 pb-5 text-base text-[#3F3B33]">
                  <p>{t(`faq.${key}.a`)}</p>
                </div>
              </li>);

          })}
        </ul>
      </div>
    </section>);

}
