import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useReveal } from '../hooks/useReveal';

/*
 * Landing-only building blocks: icon circles, the fade-up wrapper, headings and the curved dividers.
 * Button styles are in landingStyles.ts.
 */

const TONES = {
  teal: 'bg-[#E8F1EF] text-[#1F4B4D]',
  orange: 'bg-[#FCEFE6] text-[#A8441D]',
  gold: 'bg-[#F8EED2] text-[#8A6410]'
} as const;

/** A Lucide icon inside a soft coloured circle (the one icon style on the page). */
export function IconCircle({ icon: Icon, tone = 'teal', size = 'md' }: {icon: LucideIcon;tone?: keyof typeof TONES;size?: 'md' | 'lg';}) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-12 w-12';
  const glyph = size === 'lg' ? 'h-7 w-7' : 'h-6 w-6';
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center rounded-full ${TONES[tone]}`} aria-hidden="true">
      <Icon className={glyph} />
    </span>);

}

/** Fades its content up once it scrolls into view (skipped for reduced motion; see landing.css). */
export function Reveal({ children, className = '' }: {children: ReactNode;className?: string;}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return <div ref={ref} data-shown={shown} className={`landing-reveal ${className}`}>{children}</div>;
}

/**
 * A soft curve between two section colours: `from` is the section above, `to` the one below. Purely
 * decorative, fixed height (no layout shift).
 */
export function CurveDivider({ from, to, flip = false }: {from: string;to: string;flip?: boolean;}) {
  return (
    <div aria-hidden="true" style={{ backgroundColor: from }} className="leading-[0]">
      <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className={`block h-8 w-full sm:h-12 ${flip ? '-scale-x-100' : ''}`}>
        <path d="M0 40 C 240 0 480 0 720 28 C 960 56 1200 64 1440 24 L1440 64 L0 64 Z" fill={to} />
      </svg>
    </div>);

}

/** A section's h2 (focusable, so header links can move focus there) with an optional highlighted word and intro. */
export function LandingHeading({ id, children, intro, light = false, center = false }: {id: string;children: ReactNode;intro?: string;light?: boolean;center?: boolean;}) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <h2 id={id} tabIndex={-1} className={`landing-display text-3xl font-black leading-tight focus:outline-none sm:text-4xl ${light ? 'text-white' : 'text-[#1C1B18]'}`}>{children}</h2>
      {intro && <p className={`mt-3 text-base sm:text-lg ${light ? 'text-white/85' : 'text-[#5E594F]'}`}>{intro}</p>}
    </div>);

}

/** The orange highlight for one key word in a headline (used through <Trans components={{ hl: ... }} />). */
export function Highlight({ children }: {children?: ReactNode;}) {
  return <span className="landing-underline text-[#B84A20]">{children}</span>;
}
