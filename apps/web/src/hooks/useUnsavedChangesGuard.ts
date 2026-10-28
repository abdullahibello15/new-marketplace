import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Warns before losing unsaved work. In-app navigation is held so the page can show its own
 * confirm dialog; reloading or closing the tab falls back to the browser's built-in prompt.
 * Moving within the same page (e.g. #section links) is never blocked.
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers only show the prompt when returnValue is set.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  return {
    /** True while a navigation is waiting for the user to decide. */
    isBlocked: blocker.state === 'blocked',
    leave: () => blocker.proceed?.(),
    stay: () => blocker.reset?.()
  };
}
