import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useReveal } from '../hooks/useReveal';

/*
 * Landing-only building blocks: icon rings, the fade-up wrapper, headings and dividers. Glass card classes
 * and colours are in landing.css; button styles in landingStyles.ts.
 */

/** Callers can still say which accent they meant; the classic style draws every ring the same way. */
type Tone = 'teal' | 'orange' | 'gold';

/** A Lucide icon (fine stroke) inside a thin gold ring: the one icon style on the page. */
export function IconCircle({ icon: Icon, size = 'md' }: {icon: LucideIcon;tone?: Tone;size?: 'md' | 'lg';}) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-12 w-12';
  const glyph = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <span className={`landing-icon-ring flex ${box} shrink-0 items-center justify-center rounded-full`} aria-hidden="true">
      <Icon className={glyph} strokeWidth={1.5} />
    </span>);

}

/** Fades its content up once it scrolls into view (skipped for reduced motion; see landing.css). */
export function Reveal({ children, className = '' }: {children: ReactNode;className?: string;}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return <div ref={ref} data-shown={shown} className={`landing-reveal ${className}`}>{children}</div>;
}

/**
 * The break between two sections: a thin gold hairline. Purely decorative, fixed height.
 */
export function CurveDivider() {
  return (
    <div aria-hidden="true" className="px-6 py-2">
      <div className="landing-hairline mx-auto w-2/3 max-w-xl" />
    </div>);

}

/** A section's h2 (focusable, so header links can move focus there) with an optional highlighted word and intro. */
export function LandingHeading({ id, children, intro, light = false, center = false }: {id: string;children: ReactNode;intro?: string;light?: boolean;center?: boolean;}) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <h2 id={id} tabIndex={-1} className={`landing-display text-3xl leading-tight focus:outline-none sm:text-[2.6rem] ${light ? 'text-white' : 'text-[#16302F]'}`}>{children}</h2>
      {/* A short gold rule under every heading. */}
      <div aria-hidden="true" className={`mt-4 h-px w-16 bg-[#B98C34]/70 ${center ? 'mx-auto' : ''}`} />
      {intro && <p className={`mt-4 text-base sm:text-lg ${light ? 'text-white/85' : 'text-[#55524B]'}`}>{intro}</p>}
    </div>);

}

/** The highlighted word in a heading: deep-teal italic on a thin gold hairline (used through <Trans components={{ hl: ... }} />). */
export function Highlight({ children }: {children?: ReactNode;}) {
  return <span className="landing-underline text-[#1F4B4D]">{children}</span>;
}
