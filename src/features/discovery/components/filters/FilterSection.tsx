import React from 'react';

interface FilterSectionProps {
  title: string;
  /** Id of an error message to link to the group. */
  describedBy?: string;
  children: React.ReactNode;
}

/** A titled group of filter controls, separated from the next by a rule. */
export function FilterSection({ title, describedBy, children }: FilterSectionProps) {
  return (
    <fieldset aria-describedby={describedBy} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <legend className="float-left mb-3 w-full text-sm font-bold text-ink">{title}</legend>
      <div className="clear-left">{children}</div>
    </fieldset>);

}
