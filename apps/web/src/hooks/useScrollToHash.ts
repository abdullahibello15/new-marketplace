import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the element named in the URL hash (e.g. /pro/profile#profile-hours) after the page renders. */
export function useScrollToHash(ready = true) {
  const { hash } = useLocation();

  useEffect(() => {
    if (!ready || !hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    target.scrollIntoView({ block: 'start' });
    // Move focus too, so keyboard and screen reader users land in the same place.
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, [hash, ready]);
}
