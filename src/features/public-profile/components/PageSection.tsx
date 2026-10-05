import React from 'react';

interface PageSectionProps {
  id: string;
  title: string;
  /** Shown on the right of the heading row, e.g. a sort control. */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** A titled block of the profile page. The id doubles as an in-page anchor (#reviews). */
export function PageSection({ id, title, action, children }: PageSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-heading`} className="text-xs font-bold uppercase tracking-wider text-muted">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>);

}
