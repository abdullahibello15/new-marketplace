import React from 'react';
import { CheckCircle2Icon } from 'lucide-react';

interface ProfileSectionProps {
  id: string;
  title: string;
  description?: string;
  saveLabel: string;
  /** True right after a successful save; cleared by the section on the next edit. */
  saved: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
}

/** One independently saved card on the Edit profile page. */
export function ProfileSection({ id, title, description, saveLabel, saved, onSubmit, children }: ProfileSectionProps) {
  return (
    <form
      noValidate
      aria-labelledby={`${id}-heading`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="rounded-2xl border border-line bg-white p-4 lg:p-5">

      <h2 id={`${id}-heading`} className="text-base font-bold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <p role="status" className="flex items-center justify-center gap-1.5 text-sm font-semibold text-pine">
          {saved &&
          <>
              <CheckCircle2Icon className="h-4 w-4" aria-hidden="true" />
              Saved
            </>
          }
        </p>
        <button
          type="submit"
          className="rounded-xl bg-pine-deep px-5 py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2">

          {saveLabel}
        </button>
      </div>
    </form>);

}
