import { useEffect, useId, useRef, useState } from 'react';
import { InfoIcon } from 'lucide-react';
import { VerificationBadge } from '../../../../components/VerificationBadge';
import { findVerificationTier } from '../../../../data/verificationTiers';
import type { Verification } from '../../../../types/marketplace';

/**
 * The vendor's tier badge with an explanation. Opens on hover (mouse), tap or Enter/Space, and closes on
 * mouse leave, a second tap, Escape or a tap elsewhere. The badge itself is the shared VerificationBadge.
 */
export function VerificationBadgeInfo({ verification }: {verification: Verification;}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const tier = findVerificationTier(verification);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  if (!tier) return null;

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      // Hover only for mice: on touch, the synthetic hover would open it just before the tap closes it.
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">

        <VerificationBadge verification={verification} />
        <InfoIcon className="h-4 w-4 text-white/70" aria-hidden="true" />
        <span className="sr-only">What does {tier.label} mean?</span>
      </button>
      <span
        id={panelId}
        role="note"
        hidden={!open}
        className="absolute left-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-xl border border-line bg-white p-3 text-left text-sm text-ink shadow-xl">

        <span className="block font-bold">{tier.label}</span>
        <span className="mt-1 block text-muted">{tier.explanation}</span>
      </span>
    </span>);

}
