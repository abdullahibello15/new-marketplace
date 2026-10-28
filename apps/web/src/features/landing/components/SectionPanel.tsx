import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon } from 'lucide-react';

interface SectionPanelProps {
  /** The section shown, or null when closed. */
  sectionId: string | null;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A large panel over the fixed hero, opened from the header links. Built on the native <dialog>
 * (showModal): the browser traps focus inside, Escape closes it, and focus returns to the link that
 * opened it. A click on the dimmed backdrop closes it too. Full screen on phones; a big rounded card on
 * wider screens. Its content scrolls inside the panel; the page behind never moves.
 */
export function SectionPanel({ sectionId, onClose, children }: SectionPanelProps) {
  const { t } = useTranslation('landing');
  const ref = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (sectionId && !dialog.open) {
      dialog.showModal();
      // Start keyboard focus on the close button (the browser would pick the scrolling area).
      closeRef.current?.focus();
    }
    if (!sectionId && dialog.open) dialog.close();
    // A new section starts at its top.
    if (sectionId) scrollRef.current?.scrollTo({ top: 0 });
  }, [sectionId]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={sectionId ? `${sectionId}-heading` : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="landing-panel landing-glass-bg landing-root m-0 h-[100svh] max-h-none w-full max-w-none overflow-hidden p-0 text-[#1C1B18] backdrop:bg-[#1A1A1A]/50 backdrop:backdrop-blur-sm md:m-auto md:h-[min(88svh,920px)] md:w-[min(1120px,92vw)] md:rounded-[28px] md:shadow-[0_30px_80px_-30px_rgba(26,26,26,0.6)]">

      <div ref={scrollRef} className="relative h-full overflow-y-auto overscroll-contain">
        <div className="sticky top-0 z-20 flex justify-end p-3">
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label={t('panel.close')}
            className="landing-glass flex h-11 w-11 items-center justify-center !rounded-full text-[#16302F] hover:!border-[#B98C34]/70 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1F4B4D]/30">

            <XIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {/* Pull the content up under the floating close button. */}
        <div className="-mt-[4.25rem]">{sectionId && children}</div>
      </div>
    </dialog>);

}
