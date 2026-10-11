import { Trans, useTranslation } from 'react-i18next';
import { QuoteIcon } from 'lucide-react';
import { Highlight, LandingHeading, Reveal } from './ui';
import type { LandingTestimonial } from '../types';

const AVATAR_TONES = ['bg-[#E8F1EF] text-[#1F4B4D]', 'bg-[#FCEFE6] text-[#A8441D]', 'bg-[#F8EED2] text-[#7A560C]'];

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

/**
 * Speech-bubble cards quoting customers' own reviews on Gwani (five stars, with something to say), with
 * the reviewer's name and an initials avatar. No stock photos of strangers presented as customers.
 */
export function TestimonialsSection({ testimonials }: {testimonials: LandingTestimonial[] | null;}) {
  const { t } = useTranslation('landing');
  if (testimonials && testimonials.length === 0) return null;
  return (
    <section aria-labelledby="testimonials-heading" className="bg-[#FAF6EE] py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <LandingHeading id="testimonials-heading" intro={t('testimonials.intro')} center>
            <Trans t={t} i18nKey="testimonials.title" components={{ hl: <Highlight /> }} />
          </LandingHeading>
        </Reveal>
        <ul className="mt-10 grid gap-8 md:grid-cols-3">
          {(testimonials ?? Array.from({ length: 3 }, () => null)).map((item, i) =>
          <li key={item?.id ?? i}>
              {item ?
            <Reveal className="h-full">
                  <figure className="flex h-full flex-col">
                    {/* The bubble, with a little tail pointing at the reviewer. */}
                    <blockquote className="relative flex-1 rounded-3xl bg-white p-6 shadow-[0_14px_36px_-24px_rgba(22,58,60,0.5)] after:absolute after:-bottom-3 after:left-10 after:h-6 after:w-6 after:rotate-45 after:rounded-sm after:bg-white">
                      <QuoteIcon className="h-6 w-6 text-[#D9A933]" aria-hidden="true" />
                      <p className="mt-3 text-base text-[#1C1B18]">{item.comment}</p>
                    </blockquote>
                    <figcaption className="mt-6 flex items-center gap-3 pl-4">
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-black ${AVATAR_TONES[i % AVATAR_TONES.length]}`} aria-hidden="true">
                        {initials(item.reviewerName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-extrabold text-[#1C1B18]">{item.reviewerName}</span>
                        <span className="block text-sm text-[#5E594F]">{t('testimonials.about', { vendor: item.vendorName })}</span>
                      </span>
                    </figcaption>
                  </figure>
                </Reveal> :

            <div className="h-56 animate-pulse rounded-3xl bg-white/70 motion-reduce:animate-none" aria-hidden="true" />
            }
            </li>
          )}
        </ul>
      </div>
    </section>);

}
