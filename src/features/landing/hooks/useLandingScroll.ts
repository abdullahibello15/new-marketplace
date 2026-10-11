import { useCallback, useEffect, useState } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** True once the page has scrolled past `offset` px (for the header's shadow). Passive, rAF-throttled. */
export function useScrolledPast(offset = 4): boolean {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > offset);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setScrolled(window.scrollY > offset);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [offset]);
  return scrolled;
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION).matches;

/**
 * Scrolls to a section and moves keyboard focus to its heading, so screen-reader and keyboard users land
 * there too. Smooth only for people who haven't asked for reduced motion. The section's
 * scroll-margin-top keeps its heading clear of the sticky header. The URL hash is updated without a jump.
 */
export function useScrollToSection() {
  return useCallback((id: string) => {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    const heading = section.querySelector<HTMLElement>('h2');
    heading?.focus({ preventScroll: true });
    window.history.replaceState(window.history.state, '', `#${id}`);
  }, []);
}
