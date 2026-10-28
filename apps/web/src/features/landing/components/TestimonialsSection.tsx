import { Trans, useTranslation } from 'react-i18next';
import { QuoteIcon } from 'lucide-react';
import { Highlight, LandingHeading, Reveal } from './ui';
import type { LandingTestimonial } from '../types';


const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

/**
 * Speech-bubble cards quoting customers' own reviews on Gwani (five stars, with something to say), with
 * the reviewer's name and an initials avatar. No stock photos of strangers presented as customers.
 */
export function TestimonialsSection({ testimonials }: {testimonials: LandingTestimonial[] | null;}) {
  const { t } = useTranslation('landing');
  if (testimonials && testimonials.length === 0) return null;
  return (
    <section aria-labelledby="testimonials-heading" className="py-14 lg:py-20">
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
                    <blockquote className="landing-glass relative flex-1 p-6 after:absolute after:-bottom-[7px] after:left-10 after:h-3.5 after:w-3.5 after:rotate-45 after:border-b after:border-r after:border-white/60 after:bg-[#FCFAF5]">
                      <QuoteIcon className="h-6 w-6 text-[#B98C34]" strokeWidth={1.5} aria-hidden="true" />
                      <p className="landing-display mt-3 text-lg italic leading-relaxed text-[#2E2C28]">{item.comment}</p>
                    </blockquote>
                    <figcaption className="mt-6 flex items-center gap-3 pl-4">
                      <span className="landing-icon-ring landing-display flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base" aria-hidden="true">
                        {initials(item.reviewerName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-[#16302F]">{item.reviewerName}</span>
                        <span className="landing-label mt-0.5 block text-[#7A5E1F]">{t('testimonials.about', { vendor: item.vendorName })}</span>
                      </span>
                    </figcaption>
                  </figure>
                </Reveal> :

            <div className="h-56 animate-pulse rounded-[20px] bg-white/50 motion-reduce:animate-none" aria-hidden="true" />
            }
            </li>
          )}
        </ul>
      </div>
    </section>);

}
