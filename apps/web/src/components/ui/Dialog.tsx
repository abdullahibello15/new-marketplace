import React, { useEffect, useId, useRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  /** False while an action is running, so Esc and backdrop clicks don't close it mid-request. */
  dismissible?: boolean;
  /** "sheet" docks to the bottom of the screen at full width, for phone-sized pickers and filters. */
  variant?: 'center' | 'sheet';
  children?: React.ReactNode;
}

const VARIANT_CLASSES = {
  center: 'w-[calc(100%-2rem)] max-w-md rounded-2xl',
  sheet: 'mb-0 mt-auto max-h-[90dvh] w-full max-w-full rounded-t-2xl'
} as const;

/**
 * Modal built on the native <dialog>: the browser traps focus and returns it to the trigger on close.
 * Focus lands on the first focusable element inside, so put the safe choice first.
 * `open` is the source of truth; Esc and backdrop clicks ask the parent to close via `onClose`.
 */
export function Dialog({ open, onClose, title, description, dismissible = true, variant = 'center', children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();else
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClose={() => {
        // Browsers may force-close on a repeated Esc; keep the parent's state in step.
        if (open) onClose();
      }}
      onClick={(e) => {
        // A click on the <dialog> itself (not its content) is a click on the backdrop.
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={`${VARIANT_CLASSES[variant]} bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40`}>

      {open &&
      <div className="p-5 lg:p-6">
          <h2 id={titleId} className="text-lg font-extrabold text-ink">{title}</h2>
          {description && <div id={descriptionId} className="mt-1.5 text-sm text-muted">{description}</div>}
          {children && <div className="mt-5">{children}</div>}
        </div>
      }
    </dialog>);

}
