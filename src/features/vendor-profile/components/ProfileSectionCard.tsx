import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { PROFILE_SECTIONS, profileSectionAnchor } from '../constants';
import type { ProfileSectionId } from '../types';

interface ProfileSectionCardProps {
  section: ProfileSectionId;
  hasError: boolean;
  children: React.ReactNode;
}

/** One titled group of fields. The id is the target of the section nav and of deep links. */
export function ProfileSectionCard({ section, hasError, children }: ProfileSectionCardProps) {
  const meta = PROFILE_SECTIONS.find((s) => s.id === section);
  const anchor = profileSectionAnchor(section);
  return (
    <section
      id={anchor}
      aria-labelledby={`${anchor}-heading`}
      className={`scroll-mt-20 rounded-2xl border bg-white p-4 focus:outline-none lg:p-5 ${hasError ? 'border-clay/60' : 'border-line'}`}>

      <div className="flex items-start justify-between gap-3">
        <h2 id={`${anchor}-heading`} className="text-base font-bold text-ink">{meta?.label}</h2>
        {hasError && <Badge tone="danger">Needs attention</Badge>}
      </div>
      {meta?.description && <p className="mt-0.5 text-sm text-muted">{meta.description}</p>}
      <div className="mt-4">{children}</div>
    </section>);

}
