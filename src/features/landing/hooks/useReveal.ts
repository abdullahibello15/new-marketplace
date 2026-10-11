import { useEffect, useRef, useState } from 'react';

/**
 * Marks an element as shown once it scrolls into view, for the gentle fade-up in landing.css. The CSS
 * only hides content for people who haven't asked for reduced motion, and without IntersectionObserver
 * the content shows straight away, so nothing can stay invisible.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setShown(true);
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);
  return { ref, shown };
}
