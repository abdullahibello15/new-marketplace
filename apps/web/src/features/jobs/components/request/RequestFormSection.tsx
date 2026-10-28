import React from 'react';

/** A titled card in the job request form. */
export function RequestFormSection({ id, title, hint, children }: {id: string;title: string;hint?: string;children: React.ReactNode;}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="rounded-2xl border border-line bg-white p-4 lg:p-5">
      <h2 id={`${id}-heading`} className="text-base font-bold text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>);

}
