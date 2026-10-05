import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';

interface LightboxProps {
  photos: string[];
  /** Index of the open photo, or null when closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Used for alt text, e.g. "Work by Bala Plumbing". */
  altPrefix: string;
}

const SWIPE_MIN_PX = 50;

const control =
'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-150 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

export function Lightbox({ photos, index, onIndexChange, onClose, altPrefix }: LightboxProps) {
  const open = index !== null && photos.length > 0;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{x: number;y: number;} | null>(null);
  const count = photos.length;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  const current = Math.min(index ?? 0, Math.max(count - 1, 0));
  const go = (delta: number) => onIndexChange((current + delta + count) % count);

  // Swipe left/right on touch screens. Mostly-vertical gestures are ignored.
  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || count < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();else
    if (e.key === 'ArrowRight' && count > 1) go(1);else
    if (e.key === 'ArrowLeft' && count > 1) go(-1);else
    if (e.key === 'Tab') {
      // Keep focus inside the dialog.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return createPortal(
    <AnimatePresence>
      {open &&
      <motion.div
        key="lightbox"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${altPrefix}, photo ${current + 1} of ${count}`}
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="fixed inset-0 z-50 flex flex-col bg-ink/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:p-8">

          <div className="flex items-center justify-between text-white">
            <p className="text-sm font-semibold tabular-nums text-white/80">
              {current + 1} / {count}
            </p>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close photo viewer" className={control}>
              <XIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div
          className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center py-4"
          onClick={onClose}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}>
            <img
            key={photos[current]}
            src={photos[current]}
            alt={`${altPrefix}, photo ${current + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-xl object-contain" />

          </div>

          {count > 1 &&
        <div className="flex items-center justify-center gap-4">
              <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className={control}>
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next photo" className={control}>
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
        }
        </motion.div>
      }
    </AnimatePresence>,
    document.body
  );
}
