import { useEffect, useState } from 'react';

/** Time left until `expiresAt`, ticking each second. "29:41" style label; `expired` once it reaches zero. */
export function useCountdown(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const remainingMs = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const label = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
  return { remainingMs, expired: expiresAt !== null && remainingMs === 0, label };
}
