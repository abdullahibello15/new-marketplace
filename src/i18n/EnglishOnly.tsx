import React, { useLayoutEffect } from 'react';
import { enterEnglishOnly, leaveEnglishOnly } from './languageLock';

/** Wraps an English-only area (see languageLock.ts). Switches before the first paint, so there's no flash of the other language. */
export function EnglishOnly({ children }: {children: React.ReactNode;}) {
  useLayoutEffect(() => {
    enterEnglishOnly();
    return leaveEnglishOnly;
  }, []);
  return <>{children}</>;
}
